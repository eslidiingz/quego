"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/auth/session-server";
import { createImpersonationSession } from "@/lib/auth/shop-session-server";
import {
  approveShop as approveShopSvc,
  getShopById,
  rejectShop as rejectShopSvc,
  updateShop as updateShopSvc,
} from "@/lib/services/shops";
import {
  hasErrors,
  parseShopFormData,
  validateShopForm,
  type ShopFormErrors,
} from "@/lib/validation/shop";

export type ShopActionResult = { ok: boolean; message: string };

export type UpdateShopState =
  | { ok: true }
  | { ok: false; message: string; fieldErrors?: ShopFormErrors }
  | null;

/**
 * Server action wrapper for shop approval.
 * SRP: validates the caller is an admin, delegates to the service, revalidates
 * the affected paths so the UI re-fetches.
 */
export async function approveShop(id: string): Promise<ShopActionResult> {
  const session = await requireAdminSession();
  const result = await approveShopSvc(id, session.adminId);

  if (!result.ok) {
    return { ok: false, message: result.message };
  }

  revalidatePath("/admin/shops");
  revalidatePath("/admin");
  return { ok: true, message: "อนุมัติร้านเรียบร้อย" };
}

export async function rejectShop(
  id: string,
  reason: string,
): Promise<ShopActionResult> {
  const session = await requireAdminSession();
  const result = await rejectShopSvc(id, session.adminId, reason);

  if (!result.ok) {
    return { ok: false, message: result.message };
  }

  revalidatePath("/admin/shops");
  revalidatePath("/admin");
  return { ok: true, message: "ปฏิเสธร้านเรียบร้อย" };
}

/**
 * Edit a shop's profile (admin only). Reuses the same validator as the
 * public registration form so the field rules stay in sync.
 */
export async function updateShop(
  id: string,
  _prev: UpdateShopState,
  formData: FormData,
): Promise<UpdateShopState> {
  const session = await requireAdminSession();
  const parsed = parseShopFormData(formData);
  const fieldErrors = validateShopForm(parsed);
  if (hasErrors(fieldErrors)) {
    return { ok: false, message: "กรอกข้อมูลไม่ครบหรือไม่ถูกต้อง", fieldErrors };
  }

  const result = await updateShopSvc(id, parsed, session.adminId);
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

  revalidatePath("/admin/shops");
  revalidatePath("/admin");
  return { ok: true };
}

/**
 * Mint an impersonation shop session for the chosen shop and redirect into
 * the shop area. Only approved shops can be impersonated — pending/rejected
 * ones aren't allowed to log in normally either, so the same rule applies.
 *
 * SRP: action validates the admin + the target shop, then delegates token
 * minting to `createImpersonationSession`. The admin session cookie is left
 * untouched so the admin can return with one click.
 */
export async function startImpersonation(shopId: string): Promise<void> {
  const session = await requireAdminSession();
  const shop = await getShopById(shopId);
  if (!shop || shop.status !== "approved") {
    redirect("/admin/shops?notice=impersonation-unavailable");
  }
  await createImpersonationSession(
    { shopId: shop.id, phone: shop.owner_phone, shopName: shop.name },
    session.adminId,
  );
  redirect("/shop");
}
