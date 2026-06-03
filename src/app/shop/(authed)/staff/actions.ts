"use server";

import { revalidatePath } from "next/cache";
import { requireShopSession } from "@/lib/auth/shop-session-server";
import {
  createStaff,
  updateStaff,
  setStaffActive,
  deleteStaff,
} from "@/lib/services/staff";
import {
  parseStaffFormData,
  validateStaffForm,
  hasStaffErrors,
} from "@/lib/validation/shop";

/**
 * Staff (พนักงาน) management actions. Thin `"use server"` adapters: parse
 * FormData, call the service with the session's shopId (never a form field),
 * then revalidate. Capacity-affecting mutations also revalidate `/shop` and
 * `/shop/bookings` because active-staff count drives slot capacity there.
 */

function revalidateStaffSurfaces() {
  revalidatePath("/shop/staff");
  revalidatePath("/shop");
  revalidatePath("/shop/bookings");
}

export type StaffFormState =
  | { ok: true }
  | { ok: false; message: string }
  | null;

/**
 * Create (no `staffId`) or update (with `staffId`) a staff member. Client
 * validates on submit before calling this; the validator here is the
 * server-side backstop.
 */
export async function saveStaffAction(
  _prev: StaffFormState,
  formData: FormData,
): Promise<StaffFormState> {
  const session = await requireShopSession();

  const fields = parseStaffFormData(formData);
  if (hasStaffErrors(validateStaffForm(fields))) {
    return { ok: false, message: "ข้อมูลพนักงานไม่ถูกต้อง" };
  }

  const input = {
    name: fields.name,
    nickname: fields.nickname ?? null,
    role: fields.role ?? null,
    phone: fields.phone ?? null,
    isActive: fields.isActive,
  };

  const staffId = String(formData.get("staffId") ?? "").trim();
  const result = staffId
    ? await updateStaff(session.shopId, staffId, input)
    : await createStaff(session.shopId, input);

  if (!result.ok) return { ok: false, message: result.message };

  revalidateStaffSurfaces();
  return { ok: true };
}

/**
 * Toggle a staff member's active state. shopId from the verified session.
 */
export async function setStaffActiveAction(
  staffId: string,
  isActive: boolean,
): Promise<void> {
  const session = await requireShopSession();
  const result = await setStaffActive(session.shopId, staffId, isActive);
  if (!result.ok) throw new Error(result.message);
  revalidateStaffSurfaces();
}

/**
 * Delete a staff member. Their historical bookings keep existing (FK is
 * on-delete-set-null). shopId from the verified session.
 */
export async function deleteStaffAction(staffId: string): Promise<void> {
  const session = await requireShopSession();
  const result = await deleteStaff(session.shopId, staffId);
  if (!result.ok) throw new Error(result.message);
  revalidateStaffSurfaces();
}
