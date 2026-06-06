"use server";

import { revalidatePath } from "next/cache";
import { requireShopSession } from "@/lib/auth/shop-session-server";
import {
  createService,
  updateService,
  setServiceActive,
  deleteService,
  deleteAllServices,
  createServicesFromPresets,
} from "@/lib/services/services";
import { getShopCategoryRef } from "@/lib/services/shops";
import { getActivePresetsByIds } from "@/lib/services/service-presets";
import {
  parseServiceFormData,
  validateServiceForm,
  hasServiceErrors,
} from "@/lib/validation/shop";

/**
 * Service (บริการ) management actions. Thin `"use server"` adapters: parse
 * FormData, call the service with the session's shopId (never a form field),
 * then revalidate. Because a service's duration/active state drives what the
 * customer-facing booking flow shows, the shop's public pages are revalidated
 * alongside the owner surfaces.
 */

function revalidateServiceSurfaces(shopId: string) {
  revalidatePath("/shop/services");
  revalidatePath("/shop");
  revalidatePath("/shop/bookings");
  // Customer-facing surfaces that read the active-service list.
  revalidatePath(`/shops/${shopId}`);
  revalidatePath(`/shops/${shopId}/book`);
}

export type ServiceFormState =
  | { ok: true }
  | { ok: false; message: string }
  | null;

/**
 * Create (no `serviceId`) or update (with `serviceId`) a service. The client
 * validates on submit before calling this; the validator here is the
 * server-side backstop.
 */
export async function saveServiceAction(
  _prev: ServiceFormState,
  formData: FormData,
): Promise<ServiceFormState> {
  const session = await requireShopSession();

  const fields = parseServiceFormData(formData);
  if (hasServiceErrors(validateServiceForm(fields))) {
    return { ok: false, message: "ข้อมูลบริการไม่ถูกต้อง" };
  }

  const input = {
    name: fields.name,
    description: fields.description ?? null,
    durationMinutes: Number(fields.durationMinutes),
    price: fields.price ? Number(fields.price) : null,
    isActive: fields.isActive,
  };

  const serviceId = String(formData.get("serviceId") ?? "").trim();
  const result = serviceId
    ? await updateService(session.shopId, serviceId, input)
    : await createService(session.shopId, input);

  if (!result.ok) return { ok: false, message: result.message };

  revalidateServiceSurfaces(session.shopId);
  return { ok: true };
}

/**
 * Toggle a service's active state. shopId from the verified session.
 */
export async function setServiceActiveAction(
  serviceId: string,
  isActive: boolean,
): Promise<void> {
  const session = await requireShopSession();
  const result = await setServiceActive(session.shopId, serviceId, isActive);
  if (!result.ok) throw new Error(result.message);
  revalidateServiceSurfaces(session.shopId);
}

/**
 * Delete a service. Historical bookings keep their snapshotted service info
 * (FK is on-delete-set-null). shopId from the verified session.
 */
export async function deleteServiceAction(serviceId: string): Promise<void> {
  const session = await requireShopSession();
  const result = await deleteService(session.shopId, serviceId);
  if (!result.ok) throw new Error(result.message);
  revalidateServiceSurfaces(session.shopId);
}

export async function deleteAllServicesAction(): Promise<void> {
  const session = await requireShopSession();
  const result = await deleteAllServices(session.shopId);
  if (!result.ok) throw new Error(result.message);
  revalidateServiceSurfaces(session.shopId);
}

export type ImportPresetsActionState =
  | { ok: true; added: number; skipped: number }
  | { ok: false; message: string };

/**
 * Import selected category presets into the shop's catalogue. The shop's
 * category comes from its own row (never the request), and the presets are
 * re-validated to be active and in that category before copying — a crafted id
 * from another category can't sneak in. Returns the added/skipped counts so the
 * client can report the result.
 */
export async function importPresetsAction(
  presetIds: string[],
): Promise<ImportPresetsActionState> {
  const session = await requireShopSession();

  if (!Array.isArray(presetIds) || presetIds.length === 0) {
    return { ok: false, message: "กรุณาเลือกบริการอย่างน้อย 1 รายการ" };
  }

  const categoryRef = await getShopCategoryRef(session.shopId);
  if (!categoryRef) {
    return { ok: false, message: "ไม่พบหมวดหมู่ของร้าน" };
  }

  const presets = await getActivePresetsByIds(categoryRef.id, presetIds);
  if (presets.length === 0) {
    return { ok: false, message: "ไม่พบบริการ preset ที่เลือก" };
  }

  const result = await createServicesFromPresets(session.shopId, presets);
  if (!result.ok) {
    return { ok: false, message: result.message };
  }

  revalidateServiceSurfaces(session.shopId);
  return { ok: true, added: result.added, skipped: result.skipped };
}
