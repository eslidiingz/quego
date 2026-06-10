/**
 * Pure (browser-safe) waitlist eligibility helpers (OPP-05).
 *
 * Lives in `lib/waitlist/` rather than `lib/services/` so it carries no
 * `server-only` marker and can be unit-tested without a live DB. The waitlist
 * service (`services/waitlist.ts`) composes these over real queries.
 *
 * Two decisions live here:
 *   1. `hasOpenSlotForService` — given the SAME `BookingContext` the customer
 *      booking form renders from, is there a still-bookable slot for a given
 *      (service, optional preferred staff, date)? Reuses the shared `evaluateSlots`
 *      so the waitlist's "is it actually full / did a slot just open?" question
 *      can never disagree with what the picker shows.
 *   2. `isReofferable` — should an entry be (re)offered when a slot frees? A
 *      `waiting` entry always; a `notified` entry only once its head-start
 *      claim window has elapsed (so an ignored nudge rolls on to the next
 *      person without a background timer).
 */

import { evaluateSlots, type BookingContext } from "@/lib/booking/slot-math";
import { dayOfWeekFor } from "@/lib/time/bangkok";

/**
 * How long a notified waitlister keeps their head start before the offer is
 * allowed to roll on to the next eligible person. The freed slot is openly
 * bookable the whole time — this only gates re-notification on the NEXT free
 * event, so roll-on is driven by real cancellations rather than a timer.
 */
export const CLAIM_WINDOW_MINUTES = 15;

/**
 * Is there at least one still-bookable slot for this (service, preferred staff,
 * date) given the live booking context? Mirrors the booking form's capacity +
 * staff-filter logic exactly (single-queue → shop capacity; staffed "any" →
 * #capable staff; staffed specific → capacity 1), so "full" here means "full"
 * in the picker too.
 *
 * Returns false for an unknown/implicit service, a date outside the window, a
 * closed day, or a preferred staff who can't perform the service.
 */
export function hasOpenSlotForService(
  context: BookingContext,
  params: { serviceId: string; preferredStaffId: string | null; date: string },
): boolean {
  const service = context.services.find((s) => s.id === params.serviceId);
  if (!service || service.id === null) return false;

  if (params.date < context.windowStart || params.date > context.windowEnd) {
    return false;
  }

  const hours = context.hours[dayOfWeekFor(params.date)];
  if (!hours?.isOpen || !hours.openTime || !hours.closeTime) return false;

  // Capacity + staff filter mirror BookingForm's `effectiveCapacity`/`staffFilter`.
  let capacity: number;
  let staffFilter: ReadonlySet<string> | null;
  if (service.staffIds === null) {
    // Single-queue shop (no staff configured).
    capacity = context.capacity;
    staffFilter = null;
  } else if (params.preferredStaffId) {
    // Pinned to one staff member — only meaningful if they can do the service.
    if (!service.staffIds.includes(params.preferredStaffId)) return false;
    capacity = 1;
    staffFilter = new Set([params.preferredStaffId]);
  } else {
    // "ใครก็ได้" — any capable staff is a parallel line.
    if (service.staffIds.length === 0) return false;
    capacity = service.staffIds.length;
    staffFilter = new Set(service.staffIds);
  }

  const avail = evaluateSlots({
    openTime: hours.openTime,
    closeTime: hours.closeTime,
    durationMinutes: service.durationMinutes,
    date: params.date,
    intervals: context.bookedIntervals,
    capacity,
    isToday: params.date === context.nowDate,
    nowHHMM: context.nowTimeHHMM,
    staffIdFilter: staffFilter,
  });
  return avail.some((s) => s.isAvailable);
}

/**
 * Whether a waitlist entry may be (re)offered when a slot frees. `waiting`
 * entries are always eligible; a `notified` entry becomes eligible again only
 * once its claim window has elapsed since the last push (so an ignored offer
 * rolls on). `fulfilled` / `cancelled` are terminal and never re-offered. A
 * malformed/absent `notifiedAt` on a notified row is treated as eligible (fail
 * toward offering rather than stranding the queue).
 */
export function isReofferable(
  entry: { status: string; notifiedAt: string | null },
  nowMs: number,
  claimWindowMinutes: number = CLAIM_WINDOW_MINUTES,
): boolean {
  if (entry.status === "waiting") return true;
  if (entry.status !== "notified") return false;
  if (!entry.notifiedAt) return true;
  const notifiedMs = new Date(entry.notifiedAt).getTime();
  if (Number.isNaN(notifiedMs)) return true;
  return nowMs - notifiedMs >= claimWindowMinutes * 60_000;
}
