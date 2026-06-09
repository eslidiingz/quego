import { hhmmToMinutes } from "./slot-math";

/**
 * Pure, browser-safe math for a SINGLE booking's live queue position
 * ("อีก N คิวก่อนถึงคุณ" on `/bookings/[id]`).
 *
 * Mirrors how `slot-math.ts` is shared across the client/server boundary: the
 * service (`getBookingQueueStatus`, first paint) and the `LiveBookingQueue`
 * island both derive the same numbers from the same logic, so the displayed
 * position can never disagree between the two views.
 *
 * Queue model (matches `getShopPublicQueueStatus`): each staff member is an
 * independent service line, so a booking is only blocked by confirmed bookings
 * in the SAME lane (same `staffId`, or both `null` for a legacy single-queue
 * shop) that sit EARLIER in that lane AND are still "remaining" — slot >= now,
 * the same wall-clock cutoff the shop card uses, so a finished morning slot
 * stops inflating an afternoon customer's position once its time passes. The
 * position shrinks both as wall-clock time advances past earlier slots and as
 * the shop marks earlier bookings completed/cancelled (either way they leave
 * the "ahead" set).
 */

/**
 * Fallback service length (minutes) for a booking whose
 * `service_duration_minutes` is null (legacy rows / shops without a per-service
 * duration). Single source of truth for that default across the queue math —
 * callers default nulls to this before mapping into {@link QueueLaneRow}.
 */
export const DEFAULT_SERVICE_DURATION_MINUTES = 30;

export type QueueLaneRow = {
  /** Booking id — used to exclude the target itself from "ahead" counting. */
  id: string;
  /** "HH:MM" (24h, zero-padded). */
  slotTime: string;
  /** ISO timestamp — tiebreaker when two slots are equal. */
  createdAt: string;
  /** `null` = legacy single-queue shop (one shared lane). */
  staffId: string | null;
  /** Service length in minutes (caller defaults nulls before mapping). */
  durationMinutes: number;
};

/**
 * Two bookings share a service line when their `staffId` matches — including
 * `null === null` for single-queue shops. A booking on staff A never blocks a
 * booking on staff B.
 */
export function sameLane(a: QueueLaneRow, b: QueueLaneRow): boolean {
  return a.staffId === b.staffId;
}

/**
 * Is `other` ahead of `target` in the queue? Only within the same lane, earlier
 * slot first, breaking ties on `createdAt` (earlier booking wins). The target
 * is never ahead of itself (same id → false; and within a lane GiST prevents an
 * identical slot, so the id guard is belt-and-braces).
 */
export function isAhead(other: QueueLaneRow, target: QueueLaneRow): boolean {
  if (other.id === target.id) return false;
  if (!sameLane(other, target)) return false;
  const o = hhmmToMinutes(other.slotTime);
  const t = hhmmToMinutes(target.slotTime);
  if (o !== t) return o < t;
  return other.createdAt < target.createdAt;
}

/**
 * Is `row` still "remaining" — its slot has not yet passed (`slot >= now`)?
 * Mirrors `getShopPublicQueueStatus`'s wall-clock filter so a slot that is
 * already being served / done stops counting toward the customer's position and
 * wait, even before the shop marks it completed. `nowHHMM` is Bangkok-local
 * "HH:MM" (`getBangkokNow().timeHHMM`).
 */
export function isRemaining(row: QueueLaneRow, nowHHMM: string): boolean {
  return hhmmToMinutes(row.slotTime) >= hhmmToMinutes(nowHHMM);
}

/**
 * Count how many confirmed bookings sit ahead of `target` in its lane and sum
 * their durations as a back-to-back wait estimate. `rows` is the full set of
 * confirmed bookings for the shop+day (the target included — it filters itself
 * out via `isAhead`). Single lane is sequential, so the estimate sums (unlike
 * the shop-wide max across parallel lanes).
 *
 * Only bookings still "remaining" (`slot >= now`, via {@link isRemaining})
 * count — a slot already being served / done no longer inflates the position or
 * wait, matching `getShopPublicQueueStatus`. Pass `nowHHMM` as Bangkok-local
 * "HH:MM" (`getBangkokNow().timeHHMM`).
 */
export function computeQueueAhead(
  target: QueueLaneRow,
  rows: QueueLaneRow[],
  nowHHMM: string,
): { queueAhead: number; estimatedWaitMinutes: number } {
  const ahead = rows.filter(
    (r) => isAhead(r, target) && isRemaining(r, nowHHMM),
  );
  const estimatedWaitMinutes = ahead.reduce(
    (sum, r) => sum + r.durationMinutes,
    0,
  );
  return { queueAhead: ahead.length, estimatedWaitMinutes };
}
