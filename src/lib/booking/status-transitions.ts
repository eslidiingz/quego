/**
 * Which booking statuses may move to which (audit M5). Pure + browser-safe so it
 * is unit-tested and the service can turn it into a compare-and-set filter.
 *
 * Only a `confirmed` booking is live: it can be completed or cancelled. Once a
 * booking is `completed` or `cancelled` it is terminal — flipping a cancelled
 * row to completed would fake revenue in insights and customer spend, and make
 * the freed slot block the calendar again.
 */
export type BookingStatusValue = "confirmed" | "cancelled" | "completed";

const ALLOWED_FROM: Record<BookingStatusValue, readonly BookingStatusValue[]> = {
  confirmed: [],
  completed: ["confirmed"],
  cancelled: ["confirmed"],
};

/** The statuses a booking must currently be in to move to `next`. */
export function allowedFromStatuses(
  next: BookingStatusValue,
): readonly BookingStatusValue[] {
  return ALLOWED_FROM[next];
}

export function canTransitionBooking(
  from: BookingStatusValue,
  to: BookingStatusValue,
): boolean {
  return ALLOWED_FROM[to].includes(from);
}
