"use server";

import { redirect } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { verifyPassword } from "@/lib/auth/password";
import { createAdminSession } from "@/lib/auth/session-server";

export type SignInState = {
  ok: false;
  message: string;
  fieldErrors?: { phone?: string; password?: string };
} | null;

export async function signInAdmin(
  _prev: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const phone = String(formData.get("phone") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "");

  const fieldErrors: { phone?: string; password?: string } = {};
  if (!/^0\d{9}$/u.test(phone)) {
    fieldErrors.phone = "เบอร์โทรไม่ถูกต้อง (ขึ้นต้นด้วย 0 และ 10 หลัก)";
  }
  if (!password) {
    fieldErrors.password = "กรุณากรอกรหัสผ่าน";
  }
  if (fieldErrors.phone || fieldErrors.password) {
    return { ok: false, message: "กรอกข้อมูลไม่ครบหรือไม่ถูกต้อง", fieldErrors };
  }

  const supabase = getSupabaseAdmin();
  const { data: admin, error } = await supabase
    .from("admins")
    .select("id, phone, name, password_hash, is_active")
    .eq("phone", phone)
    .maybeSingle();

  if (error) {
    return { ok: false, message: "เกิดข้อผิดพลาดในการเข้าสู่ระบบ" };
  }
  if (!admin || !admin.is_active) {
    return { ok: false, message: "เบอร์หรือรหัสผ่านไม่ถูกต้อง" };
  }

  const passwordOk = await verifyPassword(password, admin.password_hash);
  if (!passwordOk) {
    return { ok: false, message: "เบอร์หรือรหัสผ่านไม่ถูกต้อง" };
  }

  await createAdminSession({
    adminId: admin.id,
    phone: admin.phone,
    name: admin.name,
  });

  redirect(next && next.startsWith("/admin") ? next : "/admin");
}
