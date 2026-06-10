"use server";

import { after } from "next/server";
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
import { writeAuditLog } from "@/lib/services/audit-log";

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

  // Record the moderation action off the response path — `after()` guarantees
  // the (fail-silent) audit insert runs even after the response flushes,
  // mirroring the LINE/credit side-effects in bookings.ts. A detached
  // `void` promise could be dropped on serverless tear-down.
  after(() =>
    writeAuditLog({
      adminId: session.adminId,
      action: "shop.approve",
      entityType: "shop",
      entityId: id,
    }),
  );

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

  after(() =>
    writeAuditLog({
      adminId: session.adminId,
      action: "shop.reject",
      entityType: "shop",
      entityId: id,
      meta: { reason },
    }),
  );

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

  after(() =>
    writeAuditLog({
      adminId: session.adminId,
      action: "shop.update",
      entityType: "shop",
      entityId: id,
      summary: parsed.name,
    }),
  );

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
  // Log BEFORE redirect — redirect() throws to unwind, so anything after it
  // never runs (and `after()` would be discarded by the redirect). Awaited so
  // the impersonation hand-off is guaranteed recorded; writeAuditLog is
  // fail-silent so it can't break the redirect.
  await writeAuditLog({
    adminId: session.adminId,
    action: "shop.impersonate",
    entityType: "shop",
    entityId: shop.id,
    meta: { shopName: shop.name },
  });
  redirect("/shop");
}
