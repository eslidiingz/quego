"use server";

import { revalidatePath } from "next/cache";
import { cancelBookingByLink } from "@/lib/services/bookings";
import { checkRateLimits, getClientIp } from "@/lib/security/rate-limit";

/**
 * OPP-04 — cancel a booking from its UUID-gated link (the booking page). The
 * booking UUID is the capability (no session here), so this is rate-limited per
 * IP to blunt link-probing, and the service enforces the shop's cutoff window +
 * confirmed status. Throws the Thai failure message so the ConfirmDialog shows
 * it inline (the trigger lives in ManageBookingActions).
 */
export async function cancelBookingByLinkAction(
  bookingId: string,
  customerPhone: string,
): Promise<void> {
  const ip = await getClientIp();
  // The phone re-entry inside cancelBookingByLink is the real authorization, so
  // the cap must bound phone GUESSES per booking. Keying on the booking UUID
  // alone (not UUID + IP) means rotating IPs buys no extra guesses. The per-IP
  // bucket is a coarse flood control across many bookings.
  if (
    !(await checkRateLimits([
      { bucket: `booking-cancel:${bookingId}`, limit: 10, windowSeconds: 3600 },
      { bucket: `booking-cancel:ip:${ip}`, limit: 30, windowSeconds: 600 },
    ]))
  ) {
    throw new Error("ทำรายการบ่อยเกินไป กรุณาลองใหม่อีกครั้งในภายหลัง");
  }
  const result = await cancelBookingByLink(bookingId, customerPhone);
  if (!result.ok) throw new Error(result.message);
  revalidatePath(`/bookings/${bookingId}`);
}
