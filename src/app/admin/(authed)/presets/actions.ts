"use server";

import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/lib/auth/session-server";
import {
  createPreset,
  updatePreset,
  deletePreset,
  setPresetActive,
} from "@/lib/services/service-presets";
import {
  parseServiceFormData,
  validateServiceForm,
  hasServiceErrors,
  type ServiceFormErrors,
} from "@/lib/validation/shop";

/**
 * Admin preset (บริการ preset) management actions. Thin `"use server"`
 * adapters: verify the admin session, parse + validate FormData (reusing the
 * shared service-form validator), call the service with the admin's id, then
 * revalidate. Domain logic + the DB backstop live in service-presets.ts.
 */

export type PresetFormState = {
  ok: boolean;
  message?: string;
  fieldErrors?: ServiceFormErrors;
} | null;

/** Imperative-action result (toggle/delete) — no field-level errors. */
export type PresetActionResult = { ok: boolean; message?: string };

function toInput(formData: FormData) {
  const fields = parseServiceFormData(formData);
  return {
    fields,
    fieldErrors: validateServiceForm(fields),
    input: {
      name: fields.name,
      description: fields.description ?? null,
      durationMinutes: Number(fields.durationMinutes),
      price: fields.price ? Number(fields.price) : null,
      isActive: fields.isActive,
    },
  };
}

export async function createPresetAction(
  categoryId: string,
  _prev: PresetFormState,
  formData: FormData,
): Promise<PresetFormState> {
  const session = await requireAdminSession();
  const { fields, fieldErrors, input } = toInput(formData);
  if (hasServiceErrors(fieldErrors)) {
    return { ok: false, message: "กรอกข้อมูลไม่ถูกต้อง", fieldErrors };
  }

  const result = await createPreset(categoryId, input, session.adminId);
  if (!result.ok) {
    if (result.code === "duplicate") {
      return { ok: false, message: result.message, fieldErrors: { name: result.message } };
    }
    return { ok: false, message: result.message };
  }

  revalidatePath("/admin/presets");
  revalidatePath("/admin");
  return { ok: true, message: `เพิ่ม "${fields.name}" เรียบร้อย` };
}

export async function updatePresetAction(
  presetId: string,
  _prev: PresetFormState,
  formData: FormData,
): Promise<PresetFormState> {
  const session = await requireAdminSession();
  const { fieldErrors, input } = toInput(formData);
  if (hasServiceErrors(fieldErrors)) {
    return { ok: false, message: "กรอกข้อมูลไม่ถูกต้อง", fieldErrors };
  }

  const result = await updatePreset(presetId, input, session.adminId);
  if (!result.ok) {
    if (result.code === "duplicate") {
      return { ok: false, message: result.message, fieldErrors: { name: result.message } };
    }
    return { ok: false, message: result.message };
  }

  revalidatePath("/admin/presets");
  return { ok: true, message: "อัปเดตเรียบร้อย" };
}

export async function setPresetActiveAction(
  presetId: string,
  isActive: boolean,
): Promise<PresetActionResult> {
  const session = await requireAdminSession();
  const result = await setPresetActive(presetId, isActive, session.adminId);
  if (!result.ok) return { ok: false, message: result.message };
  revalidatePath("/admin/presets");
  return { ok: true };
}

export async function deletePresetAction(
  presetId: string,
): Promise<PresetActionResult> {
  await requireAdminSession();
  const result = await deletePreset(presetId);
  if (!result.ok) return { ok: false, message: result.message };
  revalidatePath("/admin/presets");
  revalidatePath("/admin");
  return { ok: true, message: "ลบเรียบร้อย" };
}
