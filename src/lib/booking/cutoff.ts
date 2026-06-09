/**
 * Pure cutoff math for customer-initiated booking changes (OPP-04).
 *
 * A shop sets `reschedule_cancel_cutoff_hours` — how many hours before a
 * booking's slot a customer may still reschedule/cancel it themselves. 0 means
 * no restriction (allowed any time up to the slot start). This module answers
 * the single question "is it too late to change this booking right now?" so the
 * service-layer guards and the booking page render the exact same verdict.
 *
 * Lives in `lib/booking/` (no `server-only` marker) so both the server guards
 * and the customer-facing eligibility hint import the same function.
 *
 * All times are Bangkok wall-clock (ICT). The slot and "now" share one offset,
 * so comparing their minutes-since-epoch (via Date.UTC on the wall-clock parts)
 * gives the correct elapsed difference without any timezone conversion.
 */

export type WallClockNow = { date: string; timeHHMM: string };

/** Minutes-since-epoch for a "YYYY-MM-DD" + "HH:MM" wall-clock pair. */
function wallClockMinutes(dateYmd: string, hhmm: string): number {
  const [y, m, d] = dateYmd.split("-").map(Number);
  const [hh, mm] = hhmm.split(":").map(Number);
  return Date.UTC(y, m - 1, d, hh, mm) / 60000;
}

/**
 * True when "now" is within `cutoffHours` of the booking's slot (or past it) —
 * i.e. it is TOO LATE for the customer to change the booking themselves.
 *
 * cutoffHours = 0 → only true once the slot has started (slotMin <= nowMin),
 * preserving the legacy "allowed until the slot begins" behaviour. A negative
 * or non-finite cutoff is clamped to 0 so a bad value can never widen the gate.
 */
export function isPastChangeCutoff(
  bookingDate: string,
  slotTimeHHMM: string,
  cutoffHours: number,
  now: WallClockNow,
): boolean {
  // Clamp to the documented [0, 168] range so a bad/legacy value can neither
  // widen the gate (negative) nor over-restrict it (e.g. 500h would otherwise
  // lock every booking out of self-service changes).
  const safeCutoff = Number.isFinite(cutoffHours)
    ? Math.min(Math.max(cutoffHours, 0), 168)
    : 0;
  const slotMin = wallClockMinutes(bookingDate, slotTimeHHMM);
  const nowMin = wallClockMinutes(now.date, now.timeHHMM);
  return slotMin - nowMin <= safeCutoff * 60;
}
