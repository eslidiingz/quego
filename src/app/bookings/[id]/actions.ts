"use server";

import { revalidatePath } from "next/cache";
import { cancelBookingByLink } from "@/lib/services/bookings";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit";

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
  // Keyed by booking UUID + IP so a known-UUID attacker can't bypass the cap by
  // rotating IPs, while a shared office IP still gets its own per-booking budget.
  // The phone factor inside cancelBookingByLink is the real authorization.
  if (!(await checkRateLimit(`booking-cancel:${bookingId}:${ip}`, 10, 600))) {
    throw new Error("ทำรายการบ่อยเกินไป กรุณาลองใหม่อีกครั้งในภายหลัง");
  }
  const result = await cancelBookingByLink(bookingId, customerPhone);
  if (!result.ok) throw new Error(result.message);
  revalidatePath(`/bookings/${bookingId}`);
}
