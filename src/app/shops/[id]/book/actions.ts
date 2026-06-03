"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createBooking } from "@/lib/services/bookings";

export type CreateBookingState =
  | {
      ok: false;
      message: string;
      code: string;
      /** Present only for `slot_taken`: the exact slot another customer won, so
       *  the form can disable it client-side. */
      takenSlot?: { date: string; slotTime: string };
    }
  | null;

/**
 * Server action wrapper around `createBooking`. The form posts shopId, date
 * and slotTime as hidden inputs alongside the customer-provided name/phone
 * so the action stays a pure (state, formData) -> state shape (compatible
 * with React 19's `useActionState`).
 *
 * On success we revalidate the booking page so a refreshed form would see
 * the freshly-taken slot, then redirect to the confirmation page.
 */
export async function createBookingAction(
  _prev: CreateBookingState,
  formData: FormData,
): Promise<CreateBookingState> {
  const shopId = String(formData.get("shopId") ?? "");
  const serviceId = String(formData.get("serviceId") ?? "");
  const preferredStaffId = String(formData.get("preferredStaffId") ?? "");
  const date = String(formData.get("date") ?? "");
  const slotTime = String(formData.get("slotTime") ?? "");
  const customerName = String(formData.get("customerName") ?? "");
  const customerPhone = String(formData.get("customerPhone") ?? "");

  const result = await createBooking({
    shopId,
    serviceId: serviceId || null,
    preferredStaffId: preferredStaffId || null,
    date,
    slotTime,
    customerName,
    customerPhone,
  });

  if (!result.ok) {
    return result.code === "slot_taken"
      ? {
          ok: false,
          code: result.code,
          message: result.message,
          takenSlot: { date, slotTime },
        }
      : { ok: false, code: result.code, message: result.message };
  }

  revalidatePath(`/shops/${shopId}/book`);
  redirect(`/bookings/${result.bookingId}`);
}
