"use server";

import { redirect } from "next/navigation";
import { setCustomerLoginIntent } from "@/lib/auth/customer-session-server";

const PHONE_RE = /^0\d{9}$/u;

export type StartCustomerLoginState =
  | { ok: false; message: string; fieldErrors?: { phone?: string } }
  | null;

/**
 * Step 1 of customer login: validate the phone shape and stamp a short-lived
 * "login intent" cookie that the PIN page reads. Unlike the shop flow, we do
 * NOT check whether the customer exists — anyone with a valid phone can
 * proceed, and the row is created lazily during first PIN setup.
 */
export async function startCustomerLogin(
  _prev: StartCustomerLoginState,
  formData: FormData,
): Promise<StartCustomerLoginState> {
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

  await setCustomerLoginIntent({ phone });

  redirect("/login/pin");
}
