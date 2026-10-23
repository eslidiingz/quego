"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/auth/session-server";
import { changeAdminPassword } from "@/lib/services/admins";
import { writeAuditLog } from "@/lib/services/audit-log";
import { checkRateLimits, getClientIp } from "@/lib/security/rate-limit";
import {
  validatePasswordChange,
  type PasswordChangeFieldErrors,
} from "@/lib/validation/password";

export type ChangePasswordState = {
  ok: false;
  message: string;
  fieldErrors?: PasswordChangeFieldErrors;
} | null;

/**
 * Change the signed-in admin's password. The admin id comes ONLY from the
 * verified session; the service re-verifies the current password (sharing the
 * login lockout) before writing the new hash. Success redirects with
 * `?notice=password-changed` so FlashToast confirms it.
 */
export async function changeAdminPasswordAction(
  _prev: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const session = await requireAdminSession();
  // Never trim: spaces are legitimate password characters.
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  const fieldErrors = validatePasswordChange({
    currentPassword,
    newPassword,
    confirmPassword,
  });
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, message: "กรอกข้อมูลไม่ครบหรือไม่ถูกต้อง", fieldErrors };
  }

  // Throttle on top of the account lockout, mirroring admin login: the admin-id
  // key can't be rotated by header spoofing; the IP key caps one client.
  const ip = await getClientIp();
  if (
    !(await checkRateLimits([
      { bucket: `adminpw:ip:${ip}`, limit: 20, windowSeconds: 600 },
      { bucket: `adminpw:admin:${session.adminId}`, limit: 10, windowSeconds: 600 },
    ]))
  ) {
    return {
      ok: false,
      message: "คำขอเปลี่ยนรหัสผ่านถี่เกินไป กรุณาลองใหม่อีกครั้งในภายหลัง",
    };
  }

  const result = await changeAdminPassword(
    session.adminId,
    currentPassword,
    newPassword,
  );
  if (!result.ok) {
    if (result.code === "bad_password") {
      return {
        ok: false,
        message: result.message,
        fieldErrors: { currentPassword: result.message },
      };
    }
    return { ok: false, message: result.message };
  }

  after(() =>
    writeAuditLog({
      adminId: session.adminId,
      action: "admin.change_password",
      entityType: "admin",
      entityId: session.adminId,
      summary: session.name,
    }),
  );

  redirect("/admin/account?notice=password-changed");
}
