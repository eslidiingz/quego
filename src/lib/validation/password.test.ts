import { describe, it, expect } from "vitest";
import {
  validatePasswordChange,
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
} from "./password";

const valid = {
  currentPassword: "old-secret-1",
  newPassword: "new-secret-2",
  confirmPassword: "new-secret-2",
};

describe("validatePasswordChange", () => {
  it("accepts a well-formed change", () => {
    expect(validatePasswordChange(valid)).toEqual({});
  });

  it("requires every field", () => {
    const errors = validatePasswordChange({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    expect(errors.currentPassword).toBeDefined();
    expect(errors.newPassword).toBeDefined();
    expect(errors.confirmPassword).toBeDefined();
  });

  it("rejects a new password shorter than the minimum", () => {
    const short = "a".repeat(PASSWORD_MIN_LENGTH - 1);
    const errors = validatePasswordChange({
      ...valid,
      newPassword: short,
      confirmPassword: short,
    });
    expect(errors.newPassword).toContain(String(PASSWORD_MIN_LENGTH));
  });

  it("accepts exactly the minimum length", () => {
    const min = "a".repeat(PASSWORD_MIN_LENGTH);
    expect(
      validatePasswordChange({ ...valid, newPassword: min, confirmPassword: min }),
    ).toEqual({});
  });

  it("rejects a new password longer than the maximum", () => {
    const long = "a".repeat(PASSWORD_MAX_LENGTH + 1);
    const errors = validatePasswordChange({
      ...valid,
      newPassword: long,
      confirmPassword: long,
    });
    expect(errors.newPassword).toContain(String(PASSWORD_MAX_LENGTH));
  });

  it("counts by code point, so a 4-emoji password is too short", () => {
    // 4 code points but 8 UTF-16 units — must NOT pass the 8-char minimum.
    const emoji = "🔑🔒🗝️🛡";
    expect(emoji.length).toBeGreaterThanOrEqual(PASSWORD_MIN_LENGTH);
    const errors = validatePasswordChange({
      ...valid,
      newPassword: emoji,
      confirmPassword: emoji,
    });
    expect(errors.newPassword).toBeDefined();
  });

  it("accepts a Thai password at or above the minimum", () => {
    const thai = "รหัสผ่านดี"; // 10 code points
    expect(
      validatePasswordChange({ ...valid, newPassword: thai, confirmPassword: thai }),
    ).toEqual({});
  });

  it("rejects a whitespace-only new password", () => {
    const blank = " ".repeat(PASSWORD_MIN_LENGTH);
    const errors = validatePasswordChange({
      ...valid,
      newPassword: blank,
      confirmPassword: blank,
    });
    expect(errors.newPassword).toBeDefined();
  });

  it("rejects a new password equal to the current one", () => {
    const errors = validatePasswordChange({
      currentPassword: "same-secret",
      newPassword: "same-secret",
      confirmPassword: "same-secret",
    });
    expect(errors.newPassword).toBe("รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านปัจจุบัน");
  });

  it("does not trim — surrounding spaces make a different password", () => {
    expect(
      validatePasswordChange({
        currentPassword: "same-secret",
        newPassword: " same-secret ",
        confirmPassword: " same-secret ",
      }),
    ).toEqual({});
  });

  it("rejects a mismatched confirmation", () => {
    const errors = validatePasswordChange({
      ...valid,
      confirmPassword: "something-else",
    });
    expect(errors).toEqual({ confirmPassword: "รหัสผ่านที่ยืนยันไม่ตรงกัน" });
  });
});
