"use server";

import { redirect } from "next/navigation";
import {
  clearCustomerLoginIntent,
  createCustomerSession,
  getCustomerLoginIntent,
} from "@/lib/auth/customer-session-server";
import {
  createOrSetCustomerPin,
  verifyCustomerPin,
} from "@/lib/services/customers";
import { ensureReferralForNewCustomer } from "@/lib/services/loyalty";
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

  // First-time account created via a referral link → record the held referral
  // (REFERRAL_HOLD_DAYS hold, reward released later once the friend uses the
  // service). Best-effort: a referral never blocks account creation, so we
  // ignore the result. Done BEFORE clearing the intent so the code is still
  // available. Only the SETUP path runs this — a returning login can't be a
  // "new customer".
  if (intent.referralCode) {
    await ensureReferralForNewCustomer(intent.phone, intent.referralCode);
  }

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

  // Throttle PIN guessing: per-phone is the strong key (not header-rotatable),
  // per-IP is defence-in-depth. The atomic lockout is the deterministic ceiling;
  // this caps the rate before it.
  const verifyIp = await getClientIp();
  if (
    !(await checkRateLimits([
      { bucket: `custpin:phone:${intent.phone}`, limit: 10, windowSeconds: 600 },
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
    if (result.code === "locked") {
      return {
        ok: false,
        message: result.message,
        fieldErrors: { pin: result.message },
      };
    }
    return {
      ok: false,
      message: "รหัส PIN ไม่ถูกต้อง",
      fieldErrors: { pin: "รหัส PIN ไม่ถูกต้อง" },
    };
  }

  await createCustomerSession({
    customerId: result.customerId,
    phone: intent.phone,
  });
  await clearCustomerLoginIntent();
  redirect("/me/bookings");
}
