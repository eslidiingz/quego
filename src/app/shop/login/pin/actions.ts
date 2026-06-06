"use server";

import { redirect } from "next/navigation";
import {
  findApprovedShopByPhone,
  setShopPin,
  verifyShopPin,
} from "@/lib/services/shops";
import {
  clearShopLoginIntent,
  createShopSession,
  getShopLoginIntent,
} from "@/lib/auth/shop-session-server";
import { checkRateLimits, getClientIp } from "@/lib/security/rate-limit";

export type PinFormState =
  | { ok: false; message: string; fieldErrors?: { pin?: string; confirmPin?: string } }
  | null;

const PIN_RE = /^\d{6}$/u;

/**
 * Step 2 (setup variant): first-time PIN setup.
 * Requires a valid login intent cookie set by step 1.
 */
export async function setupShopPin(
  _prev: PinFormState,
  formData: FormData,
): Promise<PinFormState> {
  const intent = await getShopLoginIntent();
  if (!intent) {
    redirect("/login?tab=shop&notice=session-expired");
  }

  const pin = String(formData.get("pin") ?? "").trim();
  const confirmPin = String(formData.get("confirmPin") ?? "").trim();

  const fieldErrors: NonNullable<PinFormState>["fieldErrors"] = {};
  if (!PIN_RE.test(pin)) {
    fieldErrors.pin = "รหัส PIN ต้องเป็นตัวเลข 6 หลัก";
  }
  if (pin !== confirmPin) {
    fieldErrors.confirmPin = "รหัส PIN ที่ยืนยันไม่ตรงกัน";
  }
  if (fieldErrors.pin || fieldErrors.confirmPin) {
    return { ok: false, message: "กรอกข้อมูลไม่ถูกต้อง", fieldErrors };
  }

  // Throttle PIN setup per shop + per IP (the login-intent cookie alone shouldn't
  // grant unlimited write attempts to the shop's pin_hash).
  const setupIp = await getClientIp();
  if (
    !(await checkRateLimits([
      { bucket: `shoppinsetup:shop:${intent.shopId}`, limit: 5, windowSeconds: 3600 },
      { bucket: `shoppinsetup:ip:${setupIp}`, limit: 15, windowSeconds: 3600 },
    ]))
  ) {
    return {
      ok: false,
      message: "ดำเนินการถี่เกินไป กรุณาลองใหม่อีกครั้งในภายหลัง",
    };
  }

  const result = await setShopPin(intent.shopId, pin);
  if (!result.ok) {
    // pin_already_set is recoverable: route to verify instead.
    if (result.code === "pin_already_set") {
      return {
        ok: false,
        message: "บัญชีนี้ตั้งรหัส PIN ไว้แล้ว — รีโหลดหน้าเพื่อกรอก PIN เดิม",
      };
    }
    return { ok: false, message: result.message };
  }

  // Re-fetch the shop to put the canonical name in the session.
  const shop = await findApprovedShopByPhone(intent.phone);
  if (!shop) {
    return { ok: false, message: "บัญชีร้านถูกปิดใช้งานระหว่างที่ตั้ง PIN" };
  }

  await createShopSession({
    shopId: shop.id,
    phone: shop.phone,
    shopName: shop.name,
  });
  await clearShopLoginIntent();
  redirect("/shop");
}

/**
 * Step 2 (verify variant): returning login.
 */
export async function verifyShopPinAction(
  _prev: PinFormState,
  formData: FormData,
): Promise<PinFormState> {
  const intent = await getShopLoginIntent();
  if (!intent) {
    redirect("/login?tab=shop&notice=session-expired");
  }

  const pin = String(formData.get("pin") ?? "").trim();
  if (!PIN_RE.test(pin)) {
    return {
      ok: false,
      message: "รหัส PIN ไม่ถูกต้อง",
      fieldErrors: { pin: "รหัส PIN ต้องเป็นตัวเลข 6 หลัก" },
    };
  }

  // Throttle PIN guessing per shop + per IP, ahead of the atomic lockout ceiling.
  const verifyIp = await getClientIp();
  if (
    !(await checkRateLimits([
      { bucket: `shoppin:shop:${intent.shopId}`, limit: 10, windowSeconds: 600 },
      { bucket: `shoppin:ip:${verifyIp}`, limit: 30, windowSeconds: 600 },
    ]))
  ) {
    return {
      ok: false,
      message: "ลองกรอก PIN ถี่เกินไป กรุณาลองใหม่อีกครั้งในภายหลัง",
    };
  }

  const result = await verifyShopPin(intent.shopId, pin);
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

  const shop = await findApprovedShopByPhone(intent.phone);
  if (!shop) {
    return { ok: false, message: "บัญชีร้านถูกปิดใช้งาน" };
  }

  await createShopSession({
    shopId: shop.id,
    phone: shop.phone,
    shopName: shop.name,
  });
  await clearShopLoginIntent();
  redirect("/shop");
}
