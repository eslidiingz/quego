"use server";

import { redirect } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { verifyPassword } from "@/lib/auth/password";
import { createAdminSession } from "@/lib/auth/session-server";
import { lockedMessage, remainingAttemptsMessage } from "@/lib/auth/lockout";
import {
  registerFailedAttempt,
  clearFailedAttempts,
} from "@/lib/auth/lockout-store";
import { checkRateLimits, getClientIp } from "@/lib/security/rate-limit";
import { isValidThaiPhone } from "@/lib/validation/phone";

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
  if (!isValidThaiPhone(phone)) {
    fieldErrors.phone = "เบอร์โทรไม่ถูกต้อง (ขึ้นต้นด้วย 0 และ 10 หลัก)";
  }
  if (!password) {
    fieldErrors.password = "กรุณากรอกรหัสผ่าน";
  }
  if (fieldErrors.phone || fieldErrors.password) {
    return { ok: false, message: "กรอกข้อมูลไม่ครบหรือไม่ถูกต้อง", fieldErrors };
  }

  // Throttle the highest-value login. A coarse per-IP cap plus a tight
  // per-phone cap: the phone key is NOT header-rotatable, so it resists
  // X-Forwarded-For spoofing and bounds brute force, lockout-DoS, and admin
  // enumeration. The bucket increments for any submitted phone (valid or not),
  // so the throttle message itself discloses nothing.
  const ip = await getClientIp();
  if (
    !(await checkRateLimits([
      { bucket: `adminlogin:ip:${ip}`, limit: 20, windowSeconds: 600 },
      { bucket: `adminlogin:phone:${phone}`, limit: 10, windowSeconds: 600 },
    ]))
  ) {
    return {
      ok: false,
      message: "คำขอเข้าสู่ระบบถี่เกินไป กรุณาลองใหม่อีกครั้งในภายหลัง",
    };
  }

  const supabase = getSupabaseAdmin();
  const { data: admin, error } = await supabase
    .from("admins")
    .select(
      "id, phone, name, password_hash, is_active, failed_login_attempts, locked_until",
    )
    .eq("phone", phone)
    .maybeSingle();

  if (error) {
    return { ok: false, message: "เกิดข้อผิดพลาดในการเข้าสู่ระบบ" };
  }
  if (!admin || !admin.is_active) {
    return { ok: false, message: "เบอร์หรือรหัสผ่านไม่ถูกต้อง" };
  }

  const lockTarget = {
    table: "admins",
    counter: "failed_login_attempts",
  } as const;

  // Currently locked → reject before verifying the password. Surface the
  // lock state to a real, active admin; unknown phones still fall through to
  // the generic non-disclosing message above.
  // If the lock has expired, reset the counter so the admin gets a fresh 5
  // attempts rather than re-locking immediately on the first wrong guess.
  let knownAttempts = (admin.failed_login_attempts as number | null) ?? 0;
  if (admin.locked_until) {
    const lockedUntil = new Date(admin.locked_until as string);
    if (lockedUntil.getTime() > Date.now()) {
      return { ok: false, message: lockedMessage(lockedUntil) };
    }
    await clearFailedAttempts(lockTarget, admin.id);
    knownAttempts = 0;
  }

  const passwordOk = await verifyPassword(password, admin.password_hash);
  if (!passwordOk) {
    // Wrong password → register the failed attempt atomically (compare-and-swap,
    // so concurrent guesses can't race past the lock).
    const { lockedUntil, newAttempts } = await registerFailedAttempt(
      lockTarget,
      admin.id,
      knownAttempts,
    );
    if (lockedUntil) {
      return { ok: false, message: lockedMessage(lockedUntil) };
    }
    const warning = remainingAttemptsMessage(newAttempts);
    const message = warning
      ? `เบอร์หรือรหัสผ่านไม่ถูกต้อง — ${warning}`
      : "เบอร์หรือรหัสผ่านไม่ถูกต้อง";
    return { ok: false, message };
  }

  // Success → clear the counter and any stale lock.
  await clearFailedAttempts(lockTarget, admin.id);

  await createAdminSession({
    adminId: admin.id,
    phone: admin.phone,
    name: admin.name,
  });

  redirect(next && next.startsWith("/admin") ? next : "/admin");
}
