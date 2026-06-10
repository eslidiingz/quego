"use server";

import { revalidatePath } from "next/cache";
import { requireShopSession } from "@/lib/auth/shop-session-server";
import {
  getShopDisplayQueue,
  type ShopDisplaySnapshot,
} from "@/lib/services/shop-display";
import { updateBookingStatus } from "@/lib/services/bookings";

/**
 * Read-only poll for the live waiting-room display (`/shop/display`, OPP-07).
 * The island calls this every ~10s. `requireShopSession()` re-derives the shopId
 * from the verified session so the snapshot is always the caller's own shop,
 * never request input.
 *
 * Deliberately does NOT call `revalidatePath` — it fires on an interval and must
 * not churn the cache (mirrors `pollBookingQueueStatus` / `pollShopQueueStatus`).
 */
export async function pollShopDisplayQueue(): Promise<ShopDisplaySnapshot> {
  const session = await requireShopSession();
  return getShopDisplayQueue(session.shopId);
}

/**
 * Advance the queue from the kiosk: mark the given (earliest-remaining)
 * confirmed booking `completed`. The `shopId` comes from the verified session —
 * never a hidden field — so a guessed booking UUID can't flip another shop's row
 * (the service's compound `id + shop_id` filter enforces ownership). Mirrors
 * `markBookingCompleted` in the shop bookings actions, plus revalidates the
 * display route. Throws on failure so the ConfirmDialog surfaces the Thai message.
 */
export async function callNextQueueAction(bookingId: string): Promise<void> {
  const session = await requireShopSession();
  const result = await updateBookingStatus(
    bookingId,
    session.shopId,
    "completed",
  );
  if (!result.ok) {
    throw new Error(result.message);
  }
  revalidatePath("/shop");
  revalidatePath("/shop/bookings");
  revalidatePath("/shop/display");
}
