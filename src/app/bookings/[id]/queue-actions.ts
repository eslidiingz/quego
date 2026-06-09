"use server";

import {
  getBookingQueueStatus,
  type BookingQueueStatus,
} from "@/lib/services/bookings";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit";

/**
 * Public, read-only poll for the live "อีก N คิวก่อนถึงคุณ" panel on the booking
 * confirmation page (`/bookings/[id]`, OPP-01). The client island calls this
 * every ~10s with the booking id from the (UUID-gated) page — safe because the
 * result is aggregate-only (`{ active, queueAhead, estimatedWaitMinutes }`, no
 * rows / no PII) and identical to what the page renders server-side at load.
 *
 * Thin adapter mirroring `pollShopQueueStatus`: rate-limit per IP, then delegate
 * to the service. At a 10s interval one viewer makes ~60 polls / 10 min; the cap
 * is 120 / 600s — comfortably above that plus refocus catch-ups and a small
 * shared-NAT office, while still capping a scraper. FAIL-OPEN via
 * `checkRateLimit`.
 *
 * Deliberately does NOT call `revalidatePath` — like `pollShopQueueStatus`, this
 * fires on an interval and must not churn the cache. On a rate-limit hit it
 * THROWS (rather than returning zeros) so the island's catch keeps the last good
 * value instead of flashing an empty queue.
 */
export async function pollBookingQueueStatus(
  bookingId: string,
): Promise<BookingQueueStatus> {
  const ip = await getClientIp();
  if (!(await checkRateLimit(`booking-queue:${ip}`, 120, 600))) {
    throw new Error("rate_limited");
  }
  return getBookingQueueStatus(bookingId);
}
