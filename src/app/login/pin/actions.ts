"use server";

import { redirect } from "next/navigation";
import {
  clearCustomerLoginIntent,
  createCustomerSession,
  getCustomerLoginIntent,
} from "@/lib/auth/customer-session-server";
import {
  clearPhoneVerified,
  isPhoneVerified,
} from "@/lib/auth/phone-verification-server";
import {
  createOrSetCustomerPin,
  verifyCustomerPin,
} from "@/lib/services/customers";
import { checkRateLimits, getClientIp } from "@/lib/security/rate-limit";

export type PinFormState =
  | {
      ok: false;
      message: string;
      fieldErrors?: { pin?: string; pinConfirm?: string };
    }
  | null;

const PIN_RE = /^\d{6}$/u;

/**
 * Step 2 (setup variant): first-time customer PIN. Creates a customer row
 * if needed, then issues a session. Requires a valid login intent cookie.
 */
export async function setupCustomerPin(
  _prev: PinFormState,
  formData: FormData,
): Promise<PinFormState> {
  const intent = await getCustomerLoginIntent();
  if (!intent) {
    redirect("/login?notice=session-expired");
  }

  const pin = String(formData.get("pin") ?? "").trim();
  const pinConfirm = String(formData.get("pinConfirm") ?? "").trim();

  const fieldErrors: NonNullable<PinFormState>["fieldErrors"] = {};
  if (!PIN_RE.test(pin)) {
    fieldErrors.pin = "รหัส PIN ต้องเป็นตัวเลข 6 หลัก";
  }
  if (pin !== pinConfirm) {
    fieldErrors.pinConfirm = "รหัส PIN ที่ยืนยันไม่ตรงกัน";
  }
  if (fieldErrors.pin || fieldErrors.pinConfirm) {
    return { ok: false, message: "กรอกข้อมูลไม่ถูกต้อง", fieldErrors };
  }

  // Throttle account creation: per-phone caps how often a PIN can be set for one
  // number (anti-squatting / pre-takeover of the phone identity), per-IP caps
  // bulk customer-row creation across many numbers.
  const setupIp = await getClientIp();
  if (
    !(await checkRateLimits([
      { bucket: `custpinsetup:phone:${intent.phone}`, limit: 5, windowSeconds: 3600 },
      { bucket: `custpinsetup:ip:${setupIp}`, limit: 15, windowSeconds: 3600 },
    ]))
  ) {
    return {
      ok: false,
      message: "ดำเนินการถี่เกินไป กรุณาลองใหม่อีกครั้งในภายหลัง",
    };
  }

  // Hard gate: signup (first PIN setup) requires proven phone ownership. The
  // OTP UI ordering is only UX — THIS server-side cookie check is the trust
  // boundary, so a verify-one-number/register-another swap can't slip through.
  if (!(await isPhoneVerified(intent.phone))) {
    return {
      ok: false,
      message: "กรุณายืนยันเบอร์โทรด้วย OTP ก่อนตั้ง PIN",
      fieldErrors: { pin: "กรุณายืนยันเบอร์โทรด้วย OTP ก่อนตั้ง PIN" },
    };
  }

  const result = await createOrSetCustomerPin(intent.phone, pin);
  if (!result.ok) {
    if (result.code === "pin_already_set" || result.code === "duplicate") {
      return {
        ok: false,
        message:
          "บัญชีนี้ตั้งรหัส PIN ไว้แล้ว — รีโหลดหน้าเพื่อกรอก PIN เดิม",
      };
    }
    return { ok: false, message: result.message };
  }

  await createCustomerSession({
    customerId: result.customerId,
    phone: intent.phone,
  });

  // Account created — consume the OTP proof so it can't be replayed for another
  // signup, then drop the login intent.
  await clearPhoneVerified();
  await clearCustomerLoginIntent();
  redirect("/me/bookings");
}

/**
 * Step 2 (verify variant): returning customer login.
 */
export async function verifyCustomerPinAction(
  _prev: PinFormState,
  formData: FormData,
): Promise<PinFormState> {
  const intent = await getCustomerLoginIntent();
  if (!intent) {
    redirect("/login?notice=session-expired");
  }

  const pin = String(formData.get("pin") ?? "").trim();
  if (!PIN_RE.test(pin)) {
    return {
      ok: false,
      message: "รหัส PIN ไม่ถูกต้อง",
      fieldErrors: { pin: "รหัส PIN ต้องเป็นตัวเลข 6 หลัก" },
    };
  }

  // The atomic lockout (5 wrong → 10-min lock) is the authoritative per-account
  // ceiling and owns the user-facing flow; its message is clear and it resets
  // cleanly after expiry. These rate limits are only a loose flood backstop, so
  // the per-phone cap sits well ABOVE the lockout threshold — otherwise it trips
  // first and masks the lockout message with the vague "too frequent" one. (The
  // rate limiter counts every submission, including frustrated taps made while
  // the account is already locked, so a tight per-phone cap fills up fast.)
  // per-IP stays the cross-account flood control.
  const verifyIp = await getClientIp();
  if (
    !(await checkRateLimits([
      { bucket: `custpin:phone:${intent.phone}`, limit: 20, windowSeconds: 600 },
      { bucket: `custpin:ip:${verifyIp}`, limit: 30, windowSeconds: 600 },
    ]))
  ) {
    return {
      ok: false,
      message: "ลองกรอก PIN ถี่เกินไป กรุณาลองใหม่อีกครั้งในภายหลัง",
    };
  }

  const result = await verifyCustomerPin(intent.phone, pin);
  if (!result.ok) {
    return {
      ok: false,
      message: result.message,
      fieldErrors: { pin: result.message },
    };
  }

  await createCustomerSession({
    customerId: result.customerId,
    phone: intent.phone,
  });
  await clearCustomerLoginIntent();
  redirect("/me/bookings");
}
