"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createBooking } from "@/lib/services/bookings";
import { joinWaitlist } from "@/lib/services/waitlist";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit";

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

  // Rate limit per client IP: anonymous/public endpoint, so cap booking spam.
  const ip = await getClientIp();
  if (!(await checkRateLimit(`book:${ip}`, 10, 600))) {
    return {
      ok: false,
      code: "rate_limited",
      message: "คำขอถี่เกินไป กรุณาลองใหม่อีกครั้งในภายหลัง",
    };
  }

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

// ----- OPP-05: join the waitlist for a fully-booked (service, date) ---------

export type JoinWaitlistState =
  | { ok: true; alreadyWaiting: boolean }
  | { ok: false; code: string; message: string }
  | null;

/**
 * Server action wrapper around `joinWaitlist`. Posted by the WaitlistPanel that
 * appears in the time step when the chosen (service, staff, date) is full. Stays
 * a pure (state, formData) -> state shape for `useActionState`, surfacing the
 * result inline (no redirect) so the customer keeps their place in the form.
 */
export async function joinWaitlistAction(
  _prev: JoinWaitlistState,
  formData: FormData,
): Promise<JoinWaitlistState> {
  const shopId = String(formData.get("shopId") ?? "");
  const serviceId = String(formData.get("serviceId") ?? "");
  const preferredStaffId = String(formData.get("preferredStaffId") ?? "");
  const requestedDate = String(formData.get("date") ?? "");
  const customerName = String(formData.get("customerName") ?? "");
  const customerPhone = String(formData.get("customerPhone") ?? "");

  // Rate limit per client IP: public endpoint, so cap waitlist spam.
  const ip = await getClientIp();
  if (!(await checkRateLimit(`waitlist:${ip}`, 10, 600))) {
    return {
      ok: false,
      code: "rate_limited",
      message: "คำขอถี่เกินไป กรุณาลองใหม่อีกครั้งในภายหลัง",
    };
  }

  const result = await joinWaitlist({
    shopId,
    serviceId,
    preferredStaffId: preferredStaffId || null,
    requestedDate,
    customerName,
    customerPhone,
  });

  if (!result.ok) {
    return { ok: false, code: result.code, message: result.message };
  }
  return { ok: true, alreadyWaiting: result.alreadyWaiting };
}
