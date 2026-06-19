"use server";

import { revalidatePath } from "next/cache";
import { requireShopSession } from "@/lib/auth/shop-session-server";
import {
  changeShopPin,
  updateOwnShopProfile,
  setShopLogo,
  setShopCover,
  type ShopImageSlot,
} from "@/lib/services/shops";
import { unlinkShopLine } from "@/lib/services/shop-line";
import type {
  ChangePinFieldErrors,
  ChangePinState,
} from "@/components/ui/ChangePinForm";
import {
  DAYS_OF_WEEK,
  upsertBusinessHours,
  type BusinessHour,
  type DayOfWeek,
} from "@/lib/services/business-hours";
import {
  hasErrors,
  parseShopFormData,
  validateShopForm,
  type ShopFormErrors,
} from "@/lib/validation/shop";

// ----- Profile -----------------------------------------------------------

export type UpdateOwnShopState =
  | { ok: true }
  | {
      ok: false;
      message: string;
      fieldErrors?: ShopFormErrors;
      /** OPP-04: cutoff field error (not part of the shared ShopFormErrors). */
      cutoffError?: string;
    }
  | null;

/**
 * Shop-owner self-edit action for profile fields.
 *
 * SRP: parse + validate + delegate. Crucially, `ownerPhone` from the form
 * is IGNORED — the action injects the session phone so the field rule
 * passes and the owner can't lock themselves out by changing the login key.
 */
export async function updateOwnShop(
  _prev: UpdateOwnShopState,
  formData: FormData,
): Promise<UpdateOwnShopState> {
  const session = await requireShopSession();

  const parsed = parseShopFormData(formData);
  // Authoritative phone comes from the session, not the form payload.
  // The validator still needs a value for ownerPhone — injecting the
  // session phone keeps the shared validator usable without special-casing.
  parsed.ownerPhone = session.phone;

  const fieldErrors = validateShopForm(parsed);

  // Profile requires a handle (every live shop already has one); the shared
  // validator treats it as optional for registration, so enforce it here.
  if (!parsed.handle) {
    fieldErrors.handle = "กรุณากรอกลิงก์ร้าน";
  }

  // OPP-04: the cutoff is a profile-only field (the shared shop-form validator
  // is reused by public registration, which doesn't collect it), so it's parsed
  // + validated here directly.
  const cutoffRaw = String(
    formData.get("rescheduleCancelCutoffHours") ?? "",
  ).trim();
  const cutoffHours = Number(cutoffRaw);
  const cutoffError =
    cutoffRaw === "" ||
    !Number.isInteger(cutoffHours) ||
    cutoffHours < 0 ||
    cutoffHours > 168
      ? "ต้องเป็นจำนวนเต็ม 0–168 ชั่วโมง"
      : undefined;

  if (hasErrors(fieldErrors) || cutoffError) {
    return {
      ok: false,
      message: "กรอกข้อมูลไม่ครบหรือไม่ถูกต้อง",
      fieldErrors,
      cutoffError,
    };
  }

  const result = await updateOwnShopProfile(session.shopId, {
    name: parsed.name,
    handle: parsed.handle ?? "",
    categoryId: parsed.categoryId,
    description: parsed.description,
    address: parsed.address,
    province: parsed.province,
    district: parsed.district,
    subdistrict: parsed.subdistrict,
    contactPhone: parsed.contactPhone,
    ownerName: parsed.ownerName,
    ownerEmail: parsed.ownerEmail,
    rescheduleCancelCutoffHours: cutoffHours,
  });

  if (!result.ok) {
    if (result.code === "category_not_found") {
      return {
        ok: false,
        message: result.message,
        fieldErrors: { categoryId: result.message },
      };
    }
    if (result.field === "handle") {
      return {
        ok: false,
        message: result.message,
        fieldErrors: { handle: result.message },
      };
    }
    return { ok: false, message: result.message };
  }

  revalidatePath("/shop/profile");
  revalidatePath("/shop");
  return { ok: true };
}

// ----- Business hours ----------------------------------------------------

export type DayError = { open?: string; close?: string; range?: string };
export type HoursFormErrors = Partial<Record<DayOfWeek, DayError>>;

export type UpdateHoursState =
  | { ok: true }
  | { ok: false; message: string; fieldErrors?: HoursFormErrors }
  | null;

// HH:MM with minute aligned to 10-minute increments (XX:00, XX:10 … XX:50).
const TIME_RE = /^([01]\d|2[0-3]):[0-5]0$/u;

/**
 * Server action for the shop's weekly schedule. Kept side-by-side with
 * `updateOwnShop` because they live on the same profile page, but with
 * separate state + validator so a hours-only edit doesn't churn the
 * profile form.
 */
export async function updateBusinessHours(
  _prev: UpdateHoursState,
  formData: FormData,
): Promise<UpdateHoursState> {
  const session = await requireShopSession();

  const hours: BusinessHour[] = [];
  const fieldErrors: HoursFormErrors = {};

  for (const day of DAYS_OF_WEEK) {
    const isOpen = formData.get(`day_${day}_open`) === "on";
    const openRaw = String(formData.get(`day_${day}_open_time`) ?? "").trim();
    const closeRaw = String(formData.get(`day_${day}_close_time`) ?? "").trim();

    if (!isOpen) {
      hours.push({
        dayOfWeek: day,
        isOpen: false,
        openTime: null,
        closeTime: null,
      });
      continue;
    }

    const dayError: DayError = {};
    if (!openRaw) {
      dayError.open = "ต้องระบุเวลาเปิด";
    } else if (!TIME_RE.test(openRaw)) {
      dayError.open = "เวลาเปิดต้องเป็นช่วง 10 นาที (เช่น 08:00, 08:10, 08:20)";
    }
    if (!closeRaw) {
      dayError.close = "ต้องระบุเวลาปิด";
    } else if (!TIME_RE.test(closeRaw)) {
      dayError.close = "เวลาปิดต้องเป็นช่วง 10 นาที (เช่น 20:00, 20:10, 20:20)";
    }
    if (!dayError.open && !dayError.close && openRaw >= closeRaw) {
      dayError.range = "เวลาปิดต้องอยู่หลังเวลาเปิด";
    }

    if (dayError.open || dayError.close || dayError.range) {
      fieldErrors[day] = dayError;
    }

    hours.push({
      dayOfWeek: day,
      isOpen: true,
      openTime: openRaw || null,
      closeTime: closeRaw || null,
    });
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      message: "เวลาทำการของบางวันยังไม่ถูกต้อง",
      fieldErrors,
    };
  }

  const result = await upsertBusinessHours(session.shopId, hours);
  if (!result.ok) {
    return { ok: false, message: result.message };
  }

  revalidatePath("/shop/profile");
  revalidatePath("/shop");
  return { ok: true };
}

// ----- Change PIN --------------------------------------------------------

const PIN_RE = /^\d{6}$/u;

/**
 * Change the shop's login PIN. shopId comes from the verified session; the
 * service re-verifies the current PIN before writing. Mirrors the customer
 * change-PIN action so both share the `ChangePinForm`.
 */
export async function changeShopPinAction(
  _prev: ChangePinState,
  formData: FormData,
): Promise<ChangePinState> {
  const session = await requireShopSession();
  const currentPin = String(formData.get("currentPin") ?? "").trim();
  const newPin = String(formData.get("newPin") ?? "").trim();
  const confirmPin = String(formData.get("confirmPin") ?? "").trim();

  const fieldErrors: ChangePinFieldErrors = {};
  if (!PIN_RE.test(currentPin)) {
    fieldErrors.currentPin = "รหัส PIN ต้องเป็นตัวเลข 6 หลัก";
  }
  if (!PIN_RE.test(newPin)) {
    fieldErrors.newPin = "รหัส PIN ต้องเป็นตัวเลข 6 หลัก";
  } else if (newPin === currentPin) {
    fieldErrors.newPin = "รหัส PIN ใหม่ต้องไม่ซ้ำกับรหัสเดิม";
  }
  if (newPin !== confirmPin) {
    fieldErrors.confirmPin = "รหัส PIN ที่ยืนยันไม่ตรงกัน";
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, message: "กรอกข้อมูลไม่ถูกต้อง", fieldErrors };
  }

  const result = await changeShopPin(session.shopId, currentPin, newPin);
  if (!result.ok) {
    if (result.code === "bad_pin") {
      return {
        ok: false,
        message: result.message,
        fieldErrors: { currentPin: result.message },
      };
    }
    return { ok: false, message: result.message };
  }

  revalidatePath("/shop/profile");
  return { ok: true };
}

// ----- Notifications: disconnect LINE ------------------------------------

export type UnlinkShopLineState = { ok: true } | { ok: false; message: string };

/**
 * Clear the shop's LINE binding. shopId comes from the verified session. The
 * connect side is an OAuth route handler, not an action — only the disconnect
 * is a mutation we can drive from a button/ConfirmDialog.
 */
export async function unlinkShopLineAction(): Promise<UnlinkShopLineState> {
  const session = await requireShopSession();
  const result = await unlinkShopLine(session.shopId);
  if (!result.ok) {
    return { ok: false, message: result.message };
  }
  revalidatePath("/shop/profile");
  return { ok: true };
}

// ----- Shop images: logo + cover -----------------------------------------

/**
 * Result of a logo/cover mutation. `slot` is echoed back so the form knows
 * which field the toast/error belongs to (both fields drive one action).
 */
export type UpdateShopImagesState =
  | { ok: true; slot: ShopImageSlot }
  | { ok: false; slot: ShopImageSlot | null; message: string }
  | null;

/**
 * Upload the shop's logo/cover. Kept SEPARATE from `updateOwnShop` so a
 * text-only profile save never re-uploads images and an image change never
 * re-validates the whole text form (SRP — mirrors the hours/PIN/LINE split).
 *
 * An uploaded image can be replaced but never cleared: there is deliberately no
 * remove path, so the shop always keeps a logo/cover once one is set.
 *
 * Security: shopId comes from the verified session (never the form); the
 * client-supplied `slot`/`file` are re-validated, and the service re-checks the
 * file's magic bytes + size. The client crops to a fixed size before upload, so
 * the payload is small, but the caps are still enforced server-side.
 *
 * FormData contract (set by ShopImagesForm): `slot` = "logo" | "cover";
 * `file` carries the cropped image blob.
 */
export async function updateShopImagesAction(
  _prev: UpdateShopImagesState,
  formData: FormData,
): Promise<UpdateShopImagesState> {
  const session = await requireShopSession();

  const slotRaw = String(formData.get("slot") ?? "");
  const slot: ShopImageSlot | null =
    slotRaw === "logo" || slotRaw === "cover" ? slotRaw : null;
  if (!slot) {
    return { ok: false, slot: null, message: "คำขอไม่ถูกต้อง" };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, slot, message: "ไม่พบไฟล์รูปภาพ" };
  }
  const result =
    slot === "logo"
      ? await setShopLogo(session.shopId, file)
      : await setShopCover(session.shopId, file);

  if (!result.ok) {
    return { ok: false, slot, message: result.message };
  }

  // The owner's own surfaces + every public surface that renders the shop.
  // `/shops/[id]` is the ONLY public shop route (handle + UUID both resolve
  // through this one dynamic segment), so the "page" revalidation covers both.
  revalidatePath("/shop/profile");
  revalidatePath("/shop");
  revalidatePath("/");
  revalidatePath("/shops/[id]", "page");
  return { ok: true, slot };
}

