"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { rescheduleBooking } from "@/lib/services/bookings";
import { checkRateLimits, getClientIp } from "@/lib/security/rate-limit";
import { isValidThaiPhone } from "@/lib/validation/phone";

export type RescheduleState = { ok: false; message: string } | null;

/**
 * OPP-04 — move a booking to a new date/slot from its UUID-gated link. The
 * booking UUID is the capability, so the action is rate-limited per IP and the
 * service re-validates the new slot end-to-end + enforces the shop's cutoff.
 * On success it redirects back to the (same-UUID) booking page with a flash;
 * on failure it returns the Thai message for inline display on the form.
 */
export async function rescheduleBookingAction(
  _prev: RescheduleState,
  formData: FormData,
): Promise<RescheduleState> {
  const bookingId = String(formData.get("bookingId") ?? "");
  const phone = String(formData.get("phone") ?? "").trim();
  const date = String(formData.get("date") ?? "");
  const slotTime = String(formData.get("slotTime") ?? "");
  if (!bookingId || !date || !slotTime) {
    return { ok: false, message: "กรุณาเลือกวันและเวลาใหม่" };
  }
  if (!isValidThaiPhone(phone)) {
    return { ok: false, message: "กรุณายืนยันเบอร์โทรที่ใช้จอง" };
  }

  // Per-booking cap (not per booking + IP) so rotating IPs buys no extra phone
  // guesses; per-IP bucket is coarse flood control. See cancelBookingByLinkAction.
  const ip = await getClientIp();
  if (
    !(await checkRateLimits([
      { bucket: `booking-reschedule:${bookingId}`, limit: 10, windowSeconds: 3600 },
      { bucket: `booking-reschedule:ip:${ip}`, limit: 30, windowSeconds: 600 },
    ]))
  ) {
    return { ok: false, message: "ทำรายการบ่อยเกินไป กรุณาลองใหม่ภายหลัง" };
  }

  const result = await rescheduleBooking(bookingId, phone, date, slotTime);
  if (!result.ok) return { ok: false, message: result.message };

  revalidatePath(`/bookings/${bookingId}`);
  redirect(`/bookings/${bookingId}?notice=reschedule-success`);
}
