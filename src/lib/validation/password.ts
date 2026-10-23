/**
 * Admin password-change rules. Pure module (no `server-only`, no DB) so the
 * server action and the unit suite share one definition of "acceptable new
 * password". Verifying the *current* password against its hash is NOT done
 * here — that needs the DB and lives in the admin service.
 *
 * Length is counted in code points (`[...s].length`), so Thai combining marks
 * and emoji each count as one character rather than as UTF-16 units.
 */

/** Minimum new-password length, in characters. */
export const PASSWORD_MIN_LENGTH = 8;

/**
 * Maximum length. Generous for passphrases, but bounded so a huge body can't
 * make every submit pay for an oversized scrypt input.
 */
export const PASSWORD_MAX_LENGTH = 128;

export type PasswordChangeInput = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export type PasswordChangeFieldErrors = {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
};

/**
 * Validate a change-password submission. Returns per-field Thai errors; an
 * empty object means the input is acceptable and the current password can be
 * checked. Passwords are compared verbatim — never trimmed — because leading
 * or trailing spaces are legitimate password characters.
 */
export function validatePasswordChange(
  input: PasswordChangeInput,
): PasswordChangeFieldErrors {
  const { currentPassword, newPassword, confirmPassword } = input;
  const errors: PasswordChangeFieldErrors = {};

  if (!currentPassword) {
    errors.currentPassword = "กรุณากรอกรหัสผ่านปัจจุบัน";
  }

  const length = [...newPassword].length;
  if (!newPassword) {
    errors.newPassword = "กรุณากรอกรหัสผ่านใหม่";
  } else if (length < PASSWORD_MIN_LENGTH) {
    errors.newPassword = `รหัสผ่านใหม่ต้องมีอย่างน้อย ${PASSWORD_MIN_LENGTH} ตัวอักษร`;
  } else if (length > PASSWORD_MAX_LENGTH) {
    errors.newPassword = `รหัสผ่านใหม่ต้องไม่เกิน ${PASSWORD_MAX_LENGTH} ตัวอักษร`;
  } else if (newPassword.trim() === "") {
    errors.newPassword = "รหัสผ่านใหม่ต้องไม่เป็นช่องว่างทั้งหมด";
  } else if (currentPassword && newPassword === currentPassword) {
    errors.newPassword = "รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านปัจจุบัน";
  }

  if (!confirmPassword) {
    errors.confirmPassword = "กรุณายืนยันรหัสผ่านใหม่";
  } else if (confirmPassword !== newPassword) {
    errors.confirmPassword = "รหัสผ่านที่ยืนยันไม่ตรงกัน";
  }

  return errors;
}
