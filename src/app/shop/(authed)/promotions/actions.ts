"use server";

import { revalidatePath } from "next/cache";
import { requireShopSession } from "@/lib/auth/shop-session-server";
import {
  createPromotion,
  updatePromotion,
  deletePromotion,
  setPromotionActive,
  listPromotionParticipants,
  redeemPromotionReward,
  type PromotionParticipant,
} from "@/lib/services/promotions";
import {
  parsePromotionFormData,
  validatePromotionForm,
  hasPromotionErrors,
} from "@/lib/validation/shop";

/**
 * Promotion (โปรโมชั่น) management actions. Thin `"use server"` adapters: parse
 * FormData, call the service with the session's shopId (never a form field),
 * then revalidate. `shopId` ALWAYS comes from the verified session so a shop can
 * only ever touch its own promotions.
 */

function revalidatePromotionSurfaces() {
  revalidatePath("/shop/promotions");
}

export type PromotionFormState =
  | { ok: true }
  | { ok: false; message: string }
  | null;

/**
 * Create (no `promotionId`) or update (with `promotionId`) a promotion. The
 * client validates on submit before calling this; the validator here is the
 * server-side backstop.
 */
export async function savePromotionAction(
  _prev: PromotionFormState,
  formData: FormData,
): Promise<PromotionFormState> {
  const session = await requireShopSession();

  const fields = parsePromotionFormData(formData);
  if (hasPromotionErrors(validatePromotionForm(fields))) {
    return { ok: false, message: "ข้อมูลโปรโมชั่นไม่ถูกต้อง" };
  }

  const input = {
    title: fields.title,
    reward: fields.reward,
    requiredStamps: Number(fields.requiredStamps),
    description: fields.description ?? null,
    isActive: fields.isActive,
  };

  const promotionId = String(formData.get("promotionId") ?? "").trim();
  const result = promotionId
    ? await updatePromotion(session.shopId, promotionId, input)
    : await createPromotion(session.shopId, input);

  if (!result.ok) return { ok: false, message: result.message };

  revalidatePromotionSurfaces();
  return { ok: true };
}

/** Pause/resume a promotion. shopId from the verified session. */
export async function setPromotionActiveAction(
  promotionId: string,
  isActive: boolean,
): Promise<void> {
  const session = await requireShopSession();
  const result = await setPromotionActive(session.shopId, promotionId, isActive);
  if (!result.ok) throw new Error(result.message);
  revalidatePromotionSurfaces();
}

/** Delete a promotion (its stamps cascade away). shopId from the verified session. */
export async function deletePromotionAction(promotionId: string): Promise<void> {
  const session = await requireShopSession();
  const result = await deletePromotion(session.shopId, promotionId);
  if (!result.ok) throw new Error(result.message);
  revalidatePromotionSurfaces();
}

/**
 * Load the customers collecting stamps in one promotion (for the "ผู้สะสมแต้ม"
 * dialog). Read-only; scoped to the session's shop in the service layer.
 */
export async function loadPromotionParticipantsAction(
  promotionId: string,
): Promise<PromotionParticipant[]> {
  const session = await requireShopSession();
  return listPromotionParticipants(session.shopId, promotionId);
}

export type RedeemActionResult = { ok: true } | { ok: false; message: string };

/**
 * Grant (redeem) one reward for a customer. Returns a typed result so the
 * dialog can show success/failure and refresh the participants list.
 */
export async function redeemPromotionRewardAction(
  promotionId: string,
  customerPhone: string,
): Promise<RedeemActionResult> {
  const session = await requireShopSession();
  const result = await redeemPromotionReward(
    session.shopId,
    promotionId,
    customerPhone,
  );
  if (!result.ok) return { ok: false, message: result.message };
  revalidatePromotionSurfaces();
  return { ok: true };
}
