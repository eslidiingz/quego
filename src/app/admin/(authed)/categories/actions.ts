"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAdminSession } from "@/lib/auth/session-server";

export type CategoryFormState = {
  ok: boolean;
  message?: string;
  fieldErrors?: { name?: string; slug?: string; icon?: string; sort_order?: string };
} | null;

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

type ParsedInput = {
  name: string;
  slug: string;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  fieldErrors: NonNullable<CategoryFormState>["fieldErrors"];
};

function parseFormData(formData: FormData): ParsedInput {
  const name = String(formData.get("name") ?? "").trim();
  const slugRaw = String(formData.get("slug") ?? "").trim();
  const slug = slugRaw ? slugify(slugRaw) : slugify(name);
  const icon = String(formData.get("icon") ?? "").trim() || null;
  const sortOrderRaw = String(formData.get("sort_order") ?? "0").trim();
  const sort_order = Number(sortOrderRaw);
  const is_active = formData.get("is_active") === "on";

  const fieldErrors: NonNullable<CategoryFormState>["fieldErrors"] = {};
  if (!name) fieldErrors.name = "กรุณากรอกชื่อหมวดหมู่";
  if (name.length > 64) fieldErrors.name = "ชื่อต้องไม่เกิน 64 ตัวอักษร";
  if (!slug) fieldErrors.slug = "ไม่สามารถสร้าง slug จากชื่อนี้ได้";
  if (!Number.isFinite(sort_order)) fieldErrors.sort_order = "ลำดับต้องเป็นตัวเลข";

  return { name, slug, icon, sort_order, is_active, fieldErrors };
}

export async function createCategory(
  _prev: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  const session = await requireAdminSession();
  const parsed = parseFormData(formData);
  if (parsed.fieldErrors && Object.keys(parsed.fieldErrors).length > 0) {
    return { ok: false, message: "กรอกข้อมูลไม่ถูกต้อง", fieldErrors: parsed.fieldErrors };
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("shop_categories").insert({
    name: parsed.name,
    slug: parsed.slug,
    icon: parsed.icon,
    sort_order: parsed.sort_order,
    is_active: parsed.is_active,
    created_by: session.adminId,
    updated_by: session.adminId,
  });

  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        message: "มีหมวดหมู่ชื่อหรือ slug นี้อยู่แล้ว",
        fieldErrors: { name: "ซ้ำกับหมวดหมู่ที่มีอยู่", slug: "ซ้ำกับหมวดหมู่ที่มีอยู่" },
      };
    }
    // Log the real DB detail server-side; keep the client message generic so
    // schema/constraint names aren't leaked.
    console.error("createCategory error:", error);
    return { ok: false, message: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง" };
  }

  revalidatePath("/admin/categories");
  revalidatePath("/admin");
  return { ok: true, message: `เพิ่ม "${parsed.name}" เรียบร้อย` };
}

export async function updateCategory(
  id: string,
  _prev: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  const session = await requireAdminSession();
  const parsed = parseFormData(formData);
  if (parsed.fieldErrors && Object.keys(parsed.fieldErrors).length > 0) {
    return { ok: false, message: "กรอกข้อมูลไม่ถูกต้อง", fieldErrors: parsed.fieldErrors };
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("shop_categories")
    .update({
      name: parsed.name,
      slug: parsed.slug,
      icon: parsed.icon,
      sort_order: parsed.sort_order,
      is_active: parsed.is_active,
      updated_by: session.adminId,
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        message: "มีหมวดหมู่ชื่อหรือ slug นี้อยู่แล้ว",
        fieldErrors: { name: "ซ้ำกับหมวดหมู่ที่มีอยู่", slug: "ซ้ำกับหมวดหมู่ที่มีอยู่" },
      };
    }
    // Log the real DB detail server-side; keep the client message generic so
    // schema/constraint names aren't leaked.
    console.error("updateCategory error:", error);
    return { ok: false, message: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง" };
  }

  revalidatePath("/admin/categories");
  return { ok: true, message: "อัปเดตเรียบร้อย" };
}

export async function deleteCategory(id: string): Promise<CategoryFormState> {
  await requireAdminSession();
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("shop_categories").delete().eq("id", id);
  if (error) {
    // Log the real DB detail server-side; keep the client message generic so
    // schema/constraint names aren't leaked.
    console.error("deleteCategory error:", error);
    return { ok: false, message: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง" };
  }
  revalidatePath("/admin/categories");
  revalidatePath("/admin");
  return { ok: true, message: "ลบเรียบร้อย" };
}
