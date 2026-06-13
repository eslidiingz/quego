import { describe, it, expect } from "vitest";
import {
  normalizeNote,
  isNoteWithinLimit,
  isValidCustomerPhone,
  MAX_NOTE_LENGTH,
} from "./customer-notes";

describe("normalizeNote", () => {
  it("trims surrounding whitespace", () => {
    expect(normalizeNote("  ลูกค้าประจำ  ")).toBe("ลูกค้าประจำ");
  });

  it("collapses an empty string to null", () => {
    expect(normalizeNote("")).toBeNull();
  });

  it("collapses a whitespace-only string to null", () => {
    expect(normalizeNote("   \n\t ")).toBeNull();
  });

  it("treats null/undefined as null", () => {
    expect(normalizeNote(null)).toBeNull();
    expect(normalizeNote(undefined)).toBeNull();
  });

  it("keeps internal whitespace intact", () => {
    expect(normalizeNote("  แพ้ น้ำยา  บางชนิด  ")).toBe(
      "แพ้ น้ำยา  บางชนิด",
    );
  });
});

describe("isNoteWithinLimit", () => {
  it("accepts null (cleared note)", () => {
    expect(isNoteWithinLimit(null)).toBe(true);
  });

  it("accepts a note at exactly the cap", () => {
    expect(isNoteWithinLimit("ก".repeat(MAX_NOTE_LENGTH))).toBe(true);
  });

  it("rejects a note one over the cap", () => {
    expect(isNoteWithinLimit("ก".repeat(MAX_NOTE_LENGTH + 1))).toBe(false);
  });

  it("accepts a short note", () => {
    expect(isNoteWithinLimit("ลูกค้า VIP")).toBe(true);
  });
});

describe("isValidCustomerPhone", () => {
  it("accepts a 10-digit phone", () => {
    expect(isValidCustomerPhone("0812345678")).toBe(true);
  });

  it("rejects a 9-digit phone (must be exactly 10)", () => {
    expect(isValidCustomerPhone("021234567")).toBe(false);
  });

  it("rejects a 10-digit phone not starting with 0", () => {
    expect(isValidCustomerPhone("8123456789")).toBe(false);
  });

  it("rejects an 8-digit phone", () => {
    expect(isValidCustomerPhone("08123456")).toBe(false);
  });

  it("rejects an 11-digit phone", () => {
    expect(isValidCustomerPhone("08123456789")).toBe(false);
  });

  it("rejects non-digit characters", () => {
    expect(isValidCustomerPhone("081-234-5678")).toBe(false);
    expect(isValidCustomerPhone("08123abcde")).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(isValidCustomerPhone("")).toBe(false);
  });
});
