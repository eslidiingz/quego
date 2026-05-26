"use server";

import { redirect } from "next/navigation";
import { createShop } from "@/lib/services/shops";
import {
  hasErrors,
  parseShopFormData,
  validateShopForm,
  type ShopFormErrors,
} from "@/lib/validation/shop";

export type RegisterShopState =
  | { ok: false; message: string; fieldErrors?: ShopFormErrors }
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
  const parsed = parseShopFormData(formData);
  const fieldErrors = validateShopForm(parsed);
  if (hasErrors(fieldErrors)) {
    return { ok: false, message: "กรอกข้อมูลไม่ครบหรือไม่ถูกต้อง", fieldErrors };
  }

  const result = await createShop(parsed);
  if (!result.ok) {
    if (result.code === "category_not_found") {
      return {
        ok: false,
        message: result.message,
        fieldErrors: { categoryId: result.message },
      };
    }
    return { ok: false, message: result.message };
  }

  redirect(`/shops/register/success?id=${result.id}`);
}
