"use server";

import { redirect } from "next/navigation";
import { createShop } from "@/lib/services/shops";
import {
  isPhoneVerified,
  clearPhoneVerified,
} from "@/lib/auth/phone-verification-server";
import { setShopLoginIntent } from "@/lib/auth/shop-session-server";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit";
import {
  hasErrors,
  parseShopFormData,
  validateShopForm,
  type ShopFormErrors,
  type ShopFormFields,
} from "@/lib/validation/shop";

export type RegisterShopState =
  | {
      ok: false;
      message: string;
      fieldErrors?: ShopFormErrors;
      /**
       * Echoed submitted values so the form can re-seed `defaultValue`s after
       * React 19's auto-reset. See ShopRegistrationForm.
       */
      values?: ShopFormFields;
      /**
       * Server timestamp (ms). Unique per submit — used as the `key` for the
       * category <select> so it remounts and picks up the new defaultValue even
       * when the same category is submitted twice in a row.
       */
      ts: number;
    }
  | null;

/**
 * Server action for the public shop-registration form.
 *
 * SRP: parse + validate the FormData (via the shared validator that the
 * admin edit action also uses), then hand off to {@link createShop}.
 */
export async function registerShop(
  _prev: RegisterShopState,
  formData: FormData,
): Promise<RegisterShopState> {
  // Parse first (pure, no I/O) so every error path below can echo the values
  // back to the form and survive React's post-action form reset.
  const parsed = parseShopFormData(formData);

  // Rate limit per client IP: public registration is a prime abuse target.
  // 15/hour gives legitimate owners room to correct server-side errors (duplicate
  // phone, category mismatch, etc.) without exhausting their quota mid-form.
  const ip = await getClientIp();
  if (!(await checkRateLimit(`register:${ip}`, 15, 3600))) {
    return {
      ok: false,
      message: "คำขอถี่เกินไป กรุณาลองใหม่อีกครั้งในภายหลัง",
      values: parsed,
      ts: Date.now(),
    };
  }

  const fieldErrors = validateShopForm(parsed);
  if (hasErrors(fieldErrors)) {
    return {
      ok: false,
      message: "กรอกข้อมูลไม่ครบหรือไม่ถูกต้อง",
      fieldErrors,
      values: parsed,
      ts: Date.now(),
    };
  }

  // OTP gate (the real trust boundary): the owner phone must have been proven
  // via Firebase OTP in the current window. The client affordance is only UX —
  // a direct POST that skips it is rejected here.
  if (!(await isPhoneVerified(parsed.ownerPhone))) {
    return {
      ok: false,
      message: "กรุณายืนยันเบอร์โทรด้วย OTP ก่อนสมัคร",
      fieldErrors: {
        ownerPhone: "กรุณายืนยันเบอร์โทรด้วย OTP ก่อนสมัคร",
      },
      values: parsed,
      ts: Date.now(),
    };
  }

  const result = await createShop(parsed);
  if (!result.ok) {
    if (result.code === "category_not_found") {
      return {
        ok: false,
        message: result.message,
        fieldErrors: { categoryId: result.message },
        values: parsed,
        ts: Date.now(),
      };
    }
    if (result.code === "duplicate") {
      // Surface the clash at the specific field that clashed (owner phone, shop
      // phone, or email) so the owner can correct it inline.
      const field = result.field ?? "ownerPhone";
      return {
        ok: false,
        message: result.message,
        fieldErrors: { [field]: result.message },
        values: parsed,
        ts: Date.now(),
      };
    }
    return { ok: false, message: result.message, values: parsed, ts: Date.now() };
  }

  // Self-serve onboarding: the shop is created already-approved (no admin gate),
  // so send the owner straight into PIN setup. Consume the one-time OTP proof,
  // then drop a shop login-intent (the same cookie step-1 login sets) so
  // /shop/login/pin shows the "set PIN" form for this shop and, on success,
  // mints the session and lands them in /shop.
  await clearPhoneVerified();
  await setShopLoginIntent({ shopId: result.id, phone: parsed.ownerPhone });

  redirect("/shop/login/pin");
}
