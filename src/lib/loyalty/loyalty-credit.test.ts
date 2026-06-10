import { describe, it, expect } from "vitest";
import {
  creditForCompletedBooking,
  normalizeReferralCode,
  isValidReferralCodeShape,
  REFERRAL_REWARD_POINTS,
  REFERRAL_HOLD_DAYS,
  REFERRAL_CODE_LENGTH,
  REFERRAL_CODE_ALPHABET,
} from "./loyalty-credit";

describe("creditForCompletedBooking", () => {
  it("is a flat 1 point regardless of price (informational loyalty)", () => {
    expect(creditForCompletedBooking(0)).toBe(1);
    expect(creditForCompletedBooking(350)).toBe(1);
    expect(creditForCompletedBooking(99999)).toBe(1);
    expect(creditForCompletedBooking(null)).toBe(1);
  });
});

describe("referral constants", () => {
  it("rewards the referrer 5 points after a 3-day hold", () => {
    expect(REFERRAL_REWARD_POINTS).toBe(5);
    expect(REFERRAL_HOLD_DAYS).toBe(3);
  });

  it("generates codes from an unambiguous alphabet of the declared length", () => {
    expect(REFERRAL_CODE_LENGTH).toBeGreaterThanOrEqual(4);
    // No ambiguous glyphs (0/O, 1/I) in the generation alphabet.
    expect(REFERRAL_CODE_ALPHABET).not.toMatch(/[01OI]/u);
  });
});

describe("normalizeReferralCode", () => {
  it("uppercases and strips all whitespace", () => {
    expect(normalizeReferralCode("ab cd ef")).toBe("ABCDEF");
    expect(normalizeReferralCode("  abc123  ")).toBe("ABC123");
    expect(normalizeReferralCode("a\tb\nc")).toBe("ABC");
  });

  it("returns an empty string for non-string / nullish input", () => {
    expect(normalizeReferralCode(undefined)).toBe("");
    expect(normalizeReferralCode(null)).toBe("");
    expect(normalizeReferralCode(123)).toBe("");
    expect(normalizeReferralCode("")).toBe("");
  });

  it("is idempotent — normalizing twice is the same as once", () => {
    const once = normalizeReferralCode("  q r v 8 9  ");
    expect(normalizeReferralCode(once)).toBe(once);
  });
});

describe("isValidReferralCodeShape", () => {
  it("accepts canonical codes within the length band", () => {
    expect(isValidReferralCodeShape("ABCD")).toBe(true);
    expect(isValidReferralCodeShape("QRV89XYZ")).toBe(true);
    expect(isValidReferralCodeShape("A".repeat(32))).toBe(true);
  });

  it("rejects ambiguous glyphs that the alphabet excludes", () => {
    expect(isValidReferralCodeShape("ABC0")).toBe(false); // 0
    expect(isValidReferralCodeShape("ABC1")).toBe(false); // 1
    expect(isValidReferralCodeShape("ABCO")).toBe(false); // O
    expect(isValidReferralCodeShape("ABCI")).toBe(false); // I
  });

  it("rejects lowercase, whitespace, symbols, and out-of-band lengths", () => {
    expect(isValidReferralCodeShape("abcd")).toBe(false);
    expect(isValidReferralCodeShape("AB CD")).toBe(false);
    expect(isValidReferralCodeShape("AB-CD")).toBe(false);
    expect(isValidReferralCodeShape("ABC")).toBe(false); // too short
    expect(isValidReferralCodeShape("A".repeat(33))).toBe(false); // too long
    expect(isValidReferralCodeShape("")).toBe(false);
  });

  it("validates the output of normalizeReferralCode for a typical link", () => {
    const code = normalizeReferralCode("  qrv89xyz  ");
    expect(isValidReferralCodeShape(code)).toBe(true);
  });
});
