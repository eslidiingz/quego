"use server";

import { revalidatePath } from "next/cache";
import { requireShopSession } from "@/lib/auth/shop-session-server";
import {
  cancelBookingByShop,
  createBooking,
  markBookingNoShow,
  updateBookingStatus,
} from "@/lib/services/bookings";

/**
 * Mark one booking as completed. The shopId comes from the caller's
 * session (NOT from a hidden form field) so an attacker who guessed a
 * booking UUID still couldn't flip another shop's row.
 */
export async function markBookingCompleted(bookingId: string): Promise<void> {
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
}

/**
 * Cancel one confirmed booking. Like `markBookingCompleted`, the shopId comes
 * from the verified session — never a hidden form field — so a guessed booking
 * UUID can't be used to cancel another shop's row. Only confirmed bookings can
 * be cancelled (the service enforces it); anything else throws not_found.
 */
export async function cancelBookingByShopAction(
  bookingId: string,
): Promise<void> {
  const session = await requireShopSession();
  const result = await cancelBookingByShop(bookingId, session.shopId);
  if (!result.ok) {
    throw new Error(result.message);
  }
  revalidatePath("/shop");
  revalidatePath("/shop/bookings");
}

/**
 * Mark one confirmed booking as a no-show. Like `cancelBookingByShopAction`,
 * the shopId comes from the verified session — never a hidden form field — so
 * a guessed booking UUID can't be used to touch another shop's row. Only
 * confirmed bookings can be marked no-show (the service enforces it);
 * anything else throws not_found.
 */
export async function markBookingNoShowAction(
  bookingId: string,
): Promise<void> {
  const session = await requireShopSession();
  const result = await markBookingNoShow(bookingId, session.shopId);
  if (!result.ok) {
    throw new Error(result.message);
  }
  revalidatePath("/shop");
  revalidatePath("/shop/bookings");
}

// ----- Manual booking creation -------------------------------------------

export type CreateManualBookingState =
  | { ok: true }
  | { ok: false; code: string; message: string }
  | null;

/**
 * Shop-initiated booking creation — for walk-ins or phone reservations that
 * didn't come through the customer-facing flow. Uses the SAME validator as
 * the customer path (`createBooking`) so the rules (open day, slot fits,
 * slot not past, slot not already taken) are identical end-to-end.
 *
 * The shopId is taken from the verified session, never from form input.
 */
export async function createManualBookingAction(
  _prev: CreateManualBookingState,
  formData: FormData,
): Promise<CreateManualBookingState> {
  const session = await requireShopSession();
  const serviceId = String(formData.get("serviceId") ?? "");
  const preferredStaffId = String(formData.get("preferredStaffId") ?? "");
  const date = String(formData.get("date") ?? "");
  const slotTime = String(formData.get("slotTime") ?? "");
  const customerName = String(formData.get("customerName") ?? "");
  const customerPhone = String(formData.get("customerPhone") ?? "");

  const result = await createBooking({
    shopId: session.shopId,
    serviceId: serviceId || null,
    preferredStaffId: preferredStaffId || null,
    date,
    slotTime,
    customerName,
    customerPhone,
  });

  if (!result.ok) {
    return { ok: false, code: result.code, message: result.message };
  }

  revalidatePath("/shop");
  revalidatePath("/shop/bookings");
  return { ok: true };
}
