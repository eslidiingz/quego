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

  const result = await verifyCustomerPin(intent.phone, pin);
  if (!result.ok) {
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
