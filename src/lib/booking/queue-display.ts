import { hhmmToMinutes } from "./slot-math";
import { isRemaining, sameLane, type QueueLaneRow } from "./queue-position";

/**
 * Pure, browser-safe math for the shop's full-screen waiting-room DISPLAY
 * (`/shop/display`, OPP-07): which confirmed booking is being served now, what
 * is coming up, and which one the "เรียกคิวถัดไป" button advances.
 *
 * It reads from the SAME confirmed-lane model the customer position view uses
 * (`queue-position.ts` — {@link QueueLaneRow}, {@link sameLane},
 * {@link isRemaining}), so the kiosk and the customer's "อีก N คิวก่อนถึงคุณ"
 * can never disagree about which bookings still count.
 *
 * Queue model recap: each staff member is an independent service line. Across
 * the whole shop, "remaining" bookings (slot >= now, the same wall-clock cutoff
 * the customer view uses) are the live queue; finished/past slots drop out
 * automatically as time advances even before the shop marks them completed.
 *
 * Total + deterministic: given the same rows and `nowHHMM` it always returns the
 * same snapshot, with no I/O, so the page (first paint) and the polling island
 * derive identical numbers.
 */

/**
 * A row enriched with the few display-only fields the waiting room shows on top
 * of the bare {@link QueueLaneRow} queue math. The name is ALREADY masked by the
 * service (waiting-room PDPA) before it reaches this pure layer.
 */
export type DisplayQueueRow = QueueLaneRow & {
  /** Masked customer name, e.g. "สมชาย ก." / "ลูกค้า". Never the raw name. */
  customerName: string;
  /** Service label, or null when the booking has no named service. */
  serviceName: string | null;
  /** Assigned staff name, or null for a single-queue ("ใครก็ได้") lane. */
  staffName: string | null;
};

/**
 * The waiting-room snapshot the page + island render. `nextToCallBookingId`
 * drives the "เรียกคิวถัดไป" button (null → disabled, nothing left to call).
 */
export type DisplayQueueSnapshot = {
  /** The booking shown big in the hero, or null when the queue is empty today. */
  nowServing: DisplayQueueRow | null;
  /** Remaining confirmed bookings to show in the upcoming list, soonest first. */
  upcoming: DisplayQueueRow[];
  /** Id of the booking "เรียกคิวถัดไป" completes, or null when none remain. */
  nextToCallBookingId: string | null;
  /** Count of remaining confirmed bookings (includes the now-serving one). */
  waitingCount: number;
};

/**
 * Order two remaining rows for the queue: earliest slot first, ties broken by
 * the earlier `createdAt` (the booking made first wins), matching `isAhead` in
 * `queue-position.ts` so both views agree on "who is next".
 */
function byTimeThenCreated(a: DisplayQueueRow, b: DisplayQueueRow): number {
  const sa = hhmmToMinutes(a.slotTime);
  const sb = hhmmToMinutes(b.slotTime);
  if (sa !== sb) return sa - sb;
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1;
  return 0;
}

/**
 * Build the waiting-room snapshot from today's confirmed bookings.
 *
 * - Only "remaining" rows (slot >= now) form the live queue — past slots are
 *   already served/done and fall out, same cutoff as the customer view.
 * - `nowServing` is the earliest already-started remaining booking (slot <=
 *   now) — the one most likely on the chair — falling back to the soonest
 *   upcoming booking when nothing has started yet.
 * - `nextToCall` is the earliest remaining booking across ALL lanes (the
 *   shop calls one customer at a time from the kiosk), tie-broken by
 *   `createdAt`. It is the same row the shop would naturally complete first.
 *
 * Note: with one shared kiosk button the lane (`sameLane`) distinction doesn't
 * change which single row is called next — it is referenced here only to keep
 * the model honest with `queue-position.ts`; the earliest remaining row across
 * lanes is both "now serving" (once started) and "next to call".
 */
export function buildDisplayQueue(
  rows: DisplayQueueRow[],
  nowHHMM: string,
): DisplayQueueSnapshot {
  const empty: DisplayQueueSnapshot = {
    nowServing: null,
    upcoming: [],
    nextToCallBookingId: null,
    waitingCount: 0,
  };

  const remaining = rows
    .filter((r) => isRemaining(r, nowHHMM))
    .sort(byTimeThenCreated);

  if (remaining.length === 0) return empty;

  const nowMin = hhmmToMinutes(nowHHMM);
  // Earliest already-started booking (slot <= now); else the soonest upcoming.
  // `remaining` is sorted, so the first started row and the first row overall
  // are both just `.find` / `[0]`.
  const started = remaining.find((r) => hhmmToMinutes(r.slotTime) <= nowMin);
  const nowServing = started ?? remaining[0];

  // The next booking the kiosk button advances is always the earliest remaining
  // one (sorted head). Once it is completed it leaves the confirmed set and the
  // next poll surfaces the following row.
  const nextToCall = remaining[0];

  return {
    nowServing,
    // Everything except the now-serving booking, in queue order.
    upcoming: remaining.filter((r) => r.id !== nowServing.id),
    nextToCallBookingId: nextToCall.id,
    waitingCount: remaining.length,
  };
}

// Re-export so callers importing the display model don't also need to reach
// into queue-position for the lane helper when reasoning about a snapshot.
export { sameLane };
