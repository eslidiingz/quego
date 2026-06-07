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
