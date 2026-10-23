"use server";

import { redirect } from "next/navigation";
import { findShopByOwnerPhone } from "@/lib/services/shops";
import { setShopLoginIntent } from "@/lib/auth/shop-session-server";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit";
import { isValidThaiPhone } from "@/lib/validation/phone";

export type StartLoginState =
  | { ok: false; message: string; fieldErrors?: { phone?: string } }
  | null;

/**
 * Step 1 of shop login: look up the APPROVED shop for the phone, then stamp a
 * short-lived "login intent" cookie that the PIN page reads. Pure SRP: phone
 * validation + intent setup. PIN handling lives in step 2.
 *
 * Audit M8: an unknown phone gets the same redirect (with shopId null) instead
 * of "no shop uses this number", so step 1 can't be used to enumerate owners.
 */
export async function startShopLogin(
  _prev: StartLoginState,
  formData: FormData,
): Promise<StartLoginState> {
  const phone = String(formData.get("phone") ?? "").trim();

  // Rate limit per client IP: throttles brute-force PIN attempts and shop
  // phone-number enumeration (SEC-04) on this public phone-lookup step.
  const ip = await getClientIp();
  if (!(await checkRateLimit(`shoplogin:${ip}`, 20, 600))) {
    return { ok: false, message: "คำขอถี่เกินไป กรุณาลองใหม่อีกครั้งในภายหลัง" };
  }

  if (!phone) {
    return {
      ok: false,
      message: "กรุณากรอกเบอร์โทร",
      fieldErrors: { phone: "กรุณากรอกเบอร์โทร" },
    };
  }
  if (!isValidThaiPhone(phone)) {
    return {
      ok: false,
      message: "เบอร์โทรไม่ถูกต้อง",
      fieldErrors: { phone: "เบอร์โทรไม่ถูกต้อง (10 หลัก ขึ้นต้นด้วย 0)" },
    };
  }

  const shop = await findShopByOwnerPhone(phone);
  await setShopLoginIntent({ shopId: shop?.id ?? null, phone });

  redirect("/shop/login/pin");
}
