"use server";

import {
  getShopPublicQueueStatus,
  type ShopQueueStatus,
} from "@/lib/services/bookings";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit";

/**
 * Public, read-only poll for the live queue card on the shop detail page
 * (`/shops/[id]`). The client island calls this every ~10s with the shop id
 * from the (public) page — safe because the result is aggregate-only
 * (`{ waitingCount, estimatedWaitMinutes }`, no rows / no PII) and identical to
 * what the page already renders server-side at load.
 *
 * Thin adapter, mirroring `pollNewBookings`: rate-limit per IP, then delegate to
 * the service. At a 10s interval one viewer makes ~60 polls / 10 min; the cap is
 * set to 120 / 600s — comfortably above that plus refocus catch-ups and a small
 * shared-NAT office so a legitimate watcher is never throttled, while still
 * capping a scraper. FAIL-OPEN via `checkRateLimit`.
 *
 * Deliberately does NOT call `revalidatePath` — like `pollNewBookings`, this
 * fires on an interval and must not churn the cache. On a rate-limit hit it
 * THROWS (rather than returning zeros) so the island's catch keeps the last
 * good value instead of flashing an empty queue.
 */
export async function pollShopQueueStatus(
  shopId: string,
): Promise<ShopQueueStatus> {
  const ip = await getClientIp();
  if (!(await checkRateLimit(`queue:${ip}`, 120, 600))) {
    throw new Error("rate_limited");
  }
  return getShopPublicQueueStatus(shopId);
}
