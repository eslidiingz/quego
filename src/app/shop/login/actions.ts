"use server";

import { redirect } from "next/navigation";
import { findApprovedShopByPhone } from "@/lib/services/shops";
import { setShopLoginIntent } from "@/lib/auth/shop-session-server";

export type StartLoginState =
  | { ok: false; message: string; fieldErrors?: { phone?: string } }
  | null;

const PHONE_RE = /^0\d{9}$/u;

/**
 * Step 1 of shop login: verify the phone matches an APPROVED shop, then
 * stamp a short-lived "login intent" cookie that the PIN page reads.
 * Pure SRP: phone validation + intent setup. PIN handling lives in step 2.
 */
export async function startShopLogin(
  _prev: StartLoginState,
  formData: FormData,
): Promise<StartLoginState> {
  const phone = String(formData.get("phone") ?? "").trim();

  if (!phone) {
    return {
      ok: false,
      message: "กรุณากรอกเบอร์โทร",
      fieldErrors: { phone: "กรุณากรอกเบอร์โทร" },
    };
  }
  if (!PHONE_RE.test(phone)) {
    return {
      ok: false,
      message: "เบอร์โทรไม่ถูกต้อง",
      fieldErrors: { phone: "เบอร์โทรไม่ถูกต้อง (10 หลัก ขึ้นต้นด้วย 0)" },
    };
  }

  const shop = await findApprovedShopByPhone(phone);
  if (!shop) {
    // Don't disclose which condition failed (not registered vs not approved).
    return {
      ok: false,
      message:
        "ไม่พบร้านที่ใช้เบอร์นี้ในระบบ หรือยังไม่ผ่านการอนุมัติจากทีมงาน",
    };
  }

  await setShopLoginIntent({ shopId: shop.id, phone: shop.phone });

  redirect("/shop/login/pin");
}
