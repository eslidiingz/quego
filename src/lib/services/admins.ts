import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { lockedMessage, remainingAttemptsMessage } from "@/lib/auth/lockout";
import {
  registerFailedAttempt,
  clearFailedAttempts,
} from "@/lib/auth/lockout-store";
import { validatePasswordChange } from "@/lib/validation/password";

/**
 * Admin account self-service. SRP: verify + rotate an admin's own password.
 * `adminId` MUST come from the verified session — this service never trusts a
 * request-supplied id, so an admin can only ever change their own row.
 */

export type ChangeAdminPasswordResult =
  | { ok: true }
  | {
      ok: false;
      code: "invalid" | "bad_password" | "locked" | "not_found" | "unknown";
      message: string;
    };

const lockTarget = {
  table: "admins",
  counter: "failed_login_attempts",
} as const;

const GENERIC_ERROR = "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง";

/**
 * Change an admin's password after re-verifying the current one.
 *
 * Wrong current-password guesses share the login lockout counter
 * (`failed_login_attempts` / `locked_until`): a hijacked session must not
 * become an unthrottled oracle for the password, and a guess here is worth the
 * same as a guess at the login form. A lock therefore also blocks sign-in for
 * the lockout window — the same trade-off the login flow already makes.
 */
export async function changeAdminPassword(
  adminId: string,
  currentPassword: string,
  newPassword: string,
): Promise<ChangeAdminPasswordResult> {
  // Re-validate server-side; the action's field errors are a UX layer only.
  const invalid = validatePasswordChange({
    currentPassword,
    newPassword,
    confirmPassword: newPassword,
  });
  if (invalid.currentPassword || invalid.newPassword) {
    return {
      ok: false,
      code: "invalid",
      message: invalid.newPassword ?? invalid.currentPassword ?? GENERIC_ERROR,
    };
  }

  const supabase = getSupabaseAdmin();
  const { data: admin, error } = await supabase
    .from("admins")
    .select("id, password_hash, is_active, failed_login_attempts, locked_until")
    .eq("id", adminId)
    .maybeSingle();

  if (error) {
    console.error("changeAdminPassword read error:", error);
    return { ok: false, code: "unknown", message: GENERIC_ERROR };
  }
  if (!admin || !admin.is_active) {
    return { ok: false, code: "not_found", message: "ไม่พบบัญชีผู้ดูแลนี้" };
  }

  // Locked → reject before verifying. Expired lock → fresh attempt budget,
  // exactly like the login flow.
  let knownAttempts = (admin.failed_login_attempts as number | null) ?? 0;
  if (admin.locked_until) {
    const lockedUntil = new Date(admin.locked_until as string);
    if (lockedUntil.getTime() > Date.now()) {
      return { ok: false, code: "locked", message: lockedMessage(lockedUntil) };
    }
    await clearFailedAttempts(lockTarget, admin.id);
    knownAttempts = 0;
  }

  const currentOk = await verifyPassword(currentPassword, admin.password_hash);
  if (!currentOk) {
    const { lockedUntil, newAttempts } = await registerFailedAttempt(
      lockTarget,
      admin.id,
      knownAttempts,
    );
    if (lockedUntil) {
      return { ok: false, code: "locked", message: lockedMessage(lockedUntil) };
    }
    const warning = remainingAttemptsMessage(newAttempts);
    const message = warning
      ? `รหัสผ่านปัจจุบันไม่ถูกต้อง — ${warning}`
      : "รหัสผ่านปัจจุบันไม่ถูกต้อง";
    return { ok: false, code: "bad_password", message };
  }

  // Correct current password → write the new hash and clear any failed
  // attempts in the same update.
  const hash = await hashPassword(newPassword);
  const { error: updateError } = await supabase
    .from("admins")
    .update({
      password_hash: hash,
      failed_login_attempts: 0,
      locked_until: null,
    })
    .eq("id", admin.id);

  if (updateError) {
    console.error("changeAdminPassword update error:", updateError);
    return { ok: false, code: "unknown", message: GENERIC_ERROR };
  }
  return { ok: true };
}
