/**
 * Pure formatter for the public shop queue's "เวลารอโดยประมาณ" label.
 *
 * Extracted from the inline logic that used to live in the shop detail page
 * (`/shops/[id]`) so the server (first paint) and the `LiveQueueStatus` client
 * island format the SAME estimate identically — no hydration drift. Pure and
 * browser-safe (no `server-only`), mirroring how `slot-math.ts` is shared
 * across the client/server boundary.
 *
 * `estimatedWaitMinutes` is the busiest-staff-line load from
 * `getShopPublicQueueStatus` (staff serve in parallel), already a whole minute.
 */
export function formatWaitLabel(estimatedWaitMinutes: number): string {
  if (estimatedWaitMinutes === 0) return "ไม่มีคิวรอ";
  if (estimatedWaitMinutes < 60) return `~${estimatedWaitMinutes} นาที`;
  return `~${Math.round(estimatedWaitMinutes / 60)} ชม.`;
}

/**
 * Pure formatter for a single booking's live position headline on
 * `/bookings/[id]` ("อีก N คิวก่อนถึงคุณ"). Shared by the server first paint and
 * the `LiveBookingQueue` island so the two never drift — same role as
 * `formatWaitLabel`.
 *
 * `queueAhead` is `computeQueueAhead().queueAhead` — confirmed bookings ahead in
 * the customer's own lane. Zero means nobody is in front, so we say "you're
 * next" rather than the literal "อีก 0 คิว".
 */
export function formatQueueAheadLabel(queueAhead: number): string {
  if (queueAhead <= 0) return "คุณคือคิวถัดไป";
  return `อีก ${queueAhead} คิวก่อนถึงคุณ`;
}
