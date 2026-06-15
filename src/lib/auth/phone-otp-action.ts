"use server";

import { verifyFirebaseIdToken } from "@/lib/firebase/admin";
import { setPhoneVerified } from "@/lib/auth/phone-verification-server";
import { checkRateLimits, getClientIp } from "@/lib/security/rate-limit";

export type VerifyPhoneOtpResult =
  | { ok: true; phone: string }
  | { ok: false; message: string };

/**
 * Server backstop for the Firebase Phone-OTP flow. The browser handles the SMS
 * + reCAPTCHA + code-confirm and hands us the resulting ID token; here we
 * verify it with the Admin SDK (never trusting the client's word), extract the
 * PROVEN phone, and drop the short-lived signed `phone-verified` cookie the
 * signup flows consume. Rate-limited per IP as defence-in-depth on top of
 * Firebase's own SMS abuse protection.
 *
 * Shared by both signup flows (customer first PIN setup + shop registration) —
 * the downstream action is what binds the proof to a specific phone.
 */
export async function verifyPhoneOtpAction(
  idToken: string,
): Promise<VerifyPhoneOtpResult> {
  if (typeof idToken !== "string" || idToken.length < 20) {
    return { ok: false, message: "ยืนยัน OTP ไม่สำเร็จ กรุณาลองใหม่" };
  }

  const ip = await getClientIp();
  const allowed = await checkRateLimits([
    { bucket: `otpverify:ip:${ip}`, limit: 30, windowSeconds: 600 },
  ]);
  if (!allowed) {
    return {
      ok: false,
      message: "มีการยืนยันบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่",
    };
  }

  const verified = await verifyFirebaseIdToken(idToken);
  if (!verified) {
    return { ok: false, message: "ยืนยัน OTP ไม่สำเร็จ กรุณาลองใหม่" };
  }

  await setPhoneVerified(verified.phone);
  return { ok: true, phone: verified.phone };
}
