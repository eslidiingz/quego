"use server";

import { requireShopSession } from "@/lib/auth/shop-session-server";
import {
  listNewBookingsForShop,
  listNewCancellationsForShop,
} from "@/lib/services/bookings";

/**
 * One notice in the shop's live feed — a discriminated union over event kind.
 * Both kinds share the same display shape (who / when), so they flatten into one
 * record the notifier can render uniformly; `kind` drives the icon/heading and
 * `occurredAt` is the single timestamp used for ordering + dedupe (created time
 * for a new booking, cancel time for a cancellation).
 */
export type ShopNotice = {
  id: string;
  kind: "new_booking" | "cancellation";
  customerName: string;
  slotTime: string; // HH:MM
  bookingDate: string; // YYYY-MM-DD
  occurredAt: string; // UTC ISO
};

export type PollShopNotificationsResult = {
  serverNowIso: string;
  notices: ShopNotice[];
};

/**
 * Read-only poll for the shop's live notifier. The client passes its cursor
 * (`sinceIso`) and gets back any new confirmed bookings AND any customer-initiated
 * cancellations since, merged + sorted oldest-first, plus the server's current
 * time so it can advance the cursor against a single clock (no client/server
 * skew).
 *
 * The shopId is taken from the verified session — never from the client — so a
 * shop is only ever notified about its own bookings. Both reads run on one
 * cursor; a row created-then-cancelled in the same window surfaces only as a
 * cancellation (the new-booking read filters `status='confirmed'`). Deliberately
 * does NOT call revalidatePath: this fires every ~20s and must not churn the
 * cache. Impersonated sessions carry a valid shopId, so notifying them is correct.
 */
export async function pollShopNotifications(
  sinceIso: string,
): Promise<PollShopNotificationsResult> {
  const session = await requireShopSession();
  // Capture "now" BEFORE the queries: a row written mid-query (its timestamp
  // could exceed this) is then caught on the next tick rather than skipped.
  const serverNowIso = new Date().toISOString();
  const [newBookings, cancellations] = await Promise.all([
    listNewBookingsForShop(session.shopId, sinceIso),
    listNewCancellationsForShop(session.shopId, sinceIso),
  ]);

  const notices: ShopNotice[] = [
    ...newBookings.map(
      (b): ShopNotice => ({
        id: b.id,
        kind: "new_booking",
        customerName: b.customerName,
        slotTime: b.slotTime,
        bookingDate: b.bookingDate,
        occurredAt: b.createdAt,
      }),
    ),
    ...cancellations.map(
      (c): ShopNotice => ({
        id: c.id,
        kind: "cancellation",
        customerName: c.customerName,
        slotTime: c.slotTime,
        bookingDate: c.bookingDate,
        occurredAt: c.cancelledAt,
      }),
    ),
  ].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));

  return { serverNowIso, notices };
}
