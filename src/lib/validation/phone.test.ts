import { describe, it, expect } from "vitest";
import { isValidThaiPhone, THAI_PHONE_RE, PHONE_DIGITS } from "./phone";

describe("isValidThaiPhone", () => {
  it("accepts exactly 10 digits with a leading 0", () => {
    expect(isValidThaiPhone("0812345678")).toBe(true);
    expect(isValidThaiPhone("0987654321")).toBe(true);
    expect(isValidThaiPhone("0212345678")).toBe(true);
  });

  it("rejects a 9-digit number (the old lenient shape)", () => {
    expect(isValidThaiPhone("021234567")).toBe(false);
    expect(isValidThaiPhone("081234567")).toBe(false);
  });

  it("rejects fewer than 10 digits", () => {
    expect(isValidThaiPhone("08123456")).toBe(false);
    expect(isValidThaiPhone("0")).toBe(false);
  });

  it("rejects more than 10 digits", () => {
    expect(isValidThaiPhone("08123456789")).toBe(false);
  });

  it("rejects 10 digits NOT starting with 0", () => {
    expect(isValidThaiPhone("8123456789")).toBe(false);
    expect(isValidThaiPhone("1234567890")).toBe(false);
  });

  it("rejects non-digit characters", () => {
    expect(isValidThaiPhone("081-234-5678")).toBe(false);
    expect(isValidThaiPhone("081 234 5678")).toBe(false);
    expect(isValidThaiPhone("08123abcde")).toBe(false);
    expect(isValidThaiPhone("+66812345678")).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(isValidThaiPhone("")).toBe(false);
  });

  it("exposes the canonical regex and digit count", () => {
    expect(PHONE_DIGITS).toBe(10);
    expect(THAI_PHONE_RE.test("0812345678")).toBe(true);
  });
});
