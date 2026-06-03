"use server";

import { revalidatePath } from "next/cache";
import { requireShopSession } from "@/lib/auth/shop-session-server";
import {
  createStaff,
  updateStaff,
  setStaffActive,
  deleteStaff,
  setStaffServices,
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

  // Service mode (all = serves every service / some = listed services only /
  // none = back-of-house, serves nothing). "none" ⇒ providesService=false and
  // assignments are cleared; "all" ⇒ providesService=true with no assignments.
  const serviceMode = String(formData.get("serviceMode") ?? "all");
  const providesService = serviceMode !== "none";

  const input = {
    name: fields.name,
    nickname: fields.nickname ?? null,
    role: fields.role ?? null,
    phone: fields.phone ?? null,
    isActive: fields.isActive,
    providesService,
  };

  const staffId = String(formData.get("staffId") ?? "").trim();
  const result = staffId
    ? await updateStaff(session.shopId, staffId, input)
    : await createStaff(session.shopId, input);

  if (!result.ok) return { ok: false, message: result.message };

  // Persist service assignments — only meaningful in "some" mode. "all" and
  // "none" both clear assignments (empty rows). FormData.getAll returns
  // string[] for multi-value keys; filter empties just in case.
  const serviceIds =
    serviceMode === "some"
      ? formData
          .getAll("serviceIds")
          .map((v) => String(v).trim())
          .filter(Boolean)
      : [];
  await setStaffServices(session.shopId, result.id, serviceIds);

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
