"use server";

import { requireShopSession } from "@/lib/auth/shop-session-server";
import {
  listNewBookingsForShop,
  type NewBookingAlert,
} from "@/lib/services/bookings";

export type PollNewBookingsResult = {
  serverNowIso: string;
  bookings: NewBookingAlert[];
};

/**
 * Read-only poll for the shop's live new-booking notifier. The client passes
 * its cursor (`sinceIso`) and gets back any confirmed bookings created since,
 * plus the server's current time so it can advance the cursor against a single
 * clock (no client/server skew).
 *
 * The shopId is taken from the verified session — never from the client — so a
 * shop can only ever be notified about its own bookings. Deliberately does NOT
 * call revalidatePath: this fires every ~15s and must not churn the cache.
 * Impersonated sessions carry a valid shopId, so notifying them is correct.
 */
export async function pollNewBookings(
  sinceIso: string,
): Promise<PollNewBookingsResult> {
  const session = await requireShopSession();
  // Capture "now" BEFORE the query: a row inserted mid-query (created_at could
  // exceed this) is then caught on the next tick rather than skipped.
  const serverNowIso = new Date().toISOString();
  const bookings = await listNewBookingsForShop(session.shopId, sinceIso);
  return { serverNowIso, bookings };
}
