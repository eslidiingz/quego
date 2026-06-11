import { describe, it, expect } from "vitest";
import { validateReviewInput, maskReviewerName } from "./reviews";

describe("validateReviewInput", () => {
  describe("rating", () => {
    it("rejects 0 (below range)", () => {
      const result = validateReviewInput(0, null);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.message.length).toBeGreaterThan(0);
    });

    it("rejects 6 (above range)", () => {
      const result = validateReviewInput(6, null);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.message.length).toBeGreaterThan(0);
    });

    it("rejects 1.5 (non-integer)", () => {
      const result = validateReviewInput(1.5, null);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.message.length).toBeGreaterThan(0);
    });

    it("accepts 1 (lower bound)", () => {
      const result = validateReviewInput(1, null);
      expect(result.ok).toBe(true);
    });

    it("accepts 5 (upper bound)", () => {
      const result = validateReviewInput(5, null);
      expect(result.ok).toBe(true);
    });

    it("accepts 3 (mid range)", () => {
      const result = validateReviewInput(3, null);
      expect(result.ok).toBe(true);
    });
  });

  describe("comment", () => {
    it("returns null comment when comment is null", () => {
      const result = validateReviewInput(3, null);
      expect(result).toEqual({ ok: true, comment: null });
    });

    it("collapses whitespace-only comment to null", () => {
      const result = validateReviewInput(3, "   ");
      expect(result).toEqual({ ok: true, comment: null });
    });

    it("rejects a comment longer than 1000 chars (1001)", () => {
      const result = validateReviewInput(3, "x".repeat(1001));
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.message.length).toBeGreaterThan(0);
    });

    it("accepts a comment of exactly 1000 chars", () => {
      const result = validateReviewInput(3, "x".repeat(1000));
      expect(result).toEqual({ ok: true, comment: "x".repeat(1000) });
    });

    it("trims surrounding whitespace from a valid comment", () => {
      const result = validateReviewInput(3, "  good  ");
      expect(result).toEqual({ ok: true, comment: "good" });
    });
  });
});

describe("maskReviewerName", () => {
  it("falls back to generic label for null", () => {
    expect(maskReviewerName(null)).toBe("สมาชิก Queva");
  });

  it("falls back to generic label for empty string", () => {
    expect(maskReviewerName("")).toBe("สมาชิก Queva");
  });

  it("falls back to generic label for whitespace-only", () => {
    expect(maskReviewerName("   ")).toBe("สมาชิก Queva");
  });

  it("returns a single-token name unchanged", () => {
    expect(maskReviewerName("สมชาย")).toBe("สมชาย");
  });

  it("masks the surname to its first initial", () => {
    expect(maskReviewerName("สมชาย ใจดี")).toBe("สมชาย ใ.");
  });

  it("collapses multiple spaces and uses only the first two tokens", () => {
    expect(maskReviewerName("a b c")).toBe("a b.");
  });
});
