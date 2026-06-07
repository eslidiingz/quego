"use server";

import { revalidatePath } from "next/cache";
import { requireCustomerSession } from "@/lib/auth/customer-session-server";
import {
  changeCustomerPin,
  updateCustomerName,
} from "@/lib/services/customers";
import {
  requestLineLinkCode,
  unlinkCustomerLine,
} from "@/lib/services/line-linking";
import type {
  ChangePinFieldErrors,
  ChangePinState,
} from "@/components/ui/ChangePinForm";

const PIN_RE = /^\d{6}$/u;

// ----- Profile name -------------------------------------------------------

export type UpdateNameState =
  | { ok: true }
  | { ok: false; message: string; fieldErrors?: { name?: string } }
  | null;

/**
 * Update the logged-in customer's display name. customerId comes from the
 * verified session — never the form — so a customer can only edit their own.
 */
export async function updateCustomerProfile(
  _prev: UpdateNameState,
  formData: FormData,
): Promise<UpdateNameState> {
  const session = await requireCustomerSession();
  const name = String(formData.get("name") ?? "").trim();

  if (name.length > 100) {
    return {
      ok: false,
      message: "กรอกข้อมูลไม่ถูกต้อง",
      fieldErrors: { name: "ชื่อต้องยาวไม่เกิน 100 ตัวอักษร" },
    };
  }

  const result = await updateCustomerName(session.customerId, name);
  if (!result.ok) {
    return { ok: false, message: result.message };
  }

  revalidatePath("/me/profile");
  return { ok: true };
}

// ----- Change PIN ---------------------------------------------------------

export async function changeCustomerPinAction(
  _prev: ChangePinState,
  formData: FormData,
): Promise<ChangePinState> {
  const session = await requireCustomerSession();
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

  const result = await changeCustomerPin(session.customerId, currentPin, newPin);
  if (!result.ok) {
    if (result.code === "bad_current") {
      return {
        ok: false,
        message: result.message,
        fieldErrors: { currentPin: result.message },
      };
    }
    if (result.code === "bad_new") {
      return {
        ok: false,
        message: result.message,
        fieldErrors: { newPin: result.message },
      };
    }
    return { ok: false, message: result.message };
  }

  revalidatePath("/me/profile");
  return { ok: true };
}

// ----- LINE account linking -----------------------------------------------

export type RequestLinkActionState =
  | { ok: true; code: string; deepLink: string }
  | { ok: false; message: string };

/**
 * Issue a one-time LINE link code for the logged-in customer. customerId comes
 * from the verified session — never the client. Called imperatively (the card
 * has no form inputs), so it takes no args and returns the code + deep link on
 * success for the card to render.
 */
export async function requestLineLinkAction(): Promise<RequestLinkActionState> {
  const session = await requireCustomerSession();
  const result = await requestLineLinkCode(session.customerId);
  if (!result.ok) {
    return { ok: false, message: result.message };
  }
  return { ok: true, code: result.code, deepLink: result.deepLink };
}

export type UnlinkActionResult = { ok: true } | { ok: false; message: string };

/**
 * Clear the logged-in customer's LINE binding. Called imperatively from the
 * ConfirmDialog, so it returns a plain result the caller toasts on.
 */
export async function unlinkLineAction(): Promise<UnlinkActionResult> {
  const session = await requireCustomerSession();
  const result = await unlinkCustomerLine(session.customerId);
  if (!result.ok) {
    return { ok: false, message: result.message };
  }
  revalidatePath("/me/profile");
  return { ok: true };
}
