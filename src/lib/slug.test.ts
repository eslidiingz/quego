import { describe, it, expect } from "vitest";
import {
  slugify,
  isValidHandleFormat,
  isReservedHandle,
  HANDLE_MIN_LENGTH,
  HANDLE_MAX_LENGTH,
} from "./slug";

describe("slugify", () => {
  it("lowercases and hyphenates ASCII words", () => {
    expect(slugify("Nick Hair Cut")).toBe("nick-hair-cut");
    expect(slugify("The Velvet Roast")).toBe("the-velvet-roast");
  });

  it("strips Latin accents via NFKD decomposition", () => {
    expect(slugify("Café Crème")).toBe("cafe-creme");
  });

  it("drops Thai glyphs, leaving only the romanised remainder", () => {
    expect(slugify("ยาท Hair Cut")).toBe("hair-cut");
  });

  it("returns an empty string for a purely Thai name", () => {
    expect(slugify("ร้านตัดผมสมชาย")).toBe("");
    expect(slugify("แสงจันทร์ นวดแผนโบราณ")).toBe("");
  });

  it("collapses runs of separators into a single hyphen", () => {
    expect(slugify("a  --  b__c!!d")).toBe("a-b-c-d");
  });

  it("trims leading and trailing hyphens", () => {
    expect(slugify("  -hello-  ")).toBe("hello");
    expect(slugify("***hi***")).toBe("hi");
  });

  it("caps length at HANDLE_MAX_LENGTH with no trailing hyphen", () => {
    const out = slugify("a".repeat(40));
    expect(out.length).toBe(HANDLE_MAX_LENGTH);
    const cut = slugify(`${"word ".repeat(20)}`);
    expect(cut.length).toBeLessThanOrEqual(HANDLE_MAX_LENGTH);
    expect(cut.endsWith("-")).toBe(false);
  });
});

describe("isValidHandleFormat", () => {
  it("accepts valid handles", () => {
    expect(isValidHandleFormat("tukta-salon")).toBe(true);
    expect(isValidHandleFormat("abc")).toBe(true);
    expect(isValidHandleFormat("shop123")).toBe(true);
    expect(isValidHandleFormat("a1-b2-c3")).toBe(true);
    expect(isValidHandleFormat("a".repeat(HANDLE_MAX_LENGTH))).toBe(true);
  });

  it("rejects values that are too short or too long", () => {
    expect(isValidHandleFormat("ab")).toBe(false);
    expect(isValidHandleFormat("a".repeat(HANDLE_MAX_LENGTH + 1))).toBe(false);
    expect(HANDLE_MIN_LENGTH).toBe(3);
  });

  it("rejects leading or trailing hyphens", () => {
    expect(isValidHandleFormat("-abc")).toBe(false);
    expect(isValidHandleFormat("abc-")).toBe(false);
  });

  it("rejects consecutive hyphens", () => {
    expect(isValidHandleFormat("a--b")).toBe(false);
  });

  it("rejects uppercase, spaces, and non-ASCII", () => {
    expect(isValidHandleFormat("AbC")).toBe(false);
    expect(isValidHandleFormat("a b")).toBe(false);
    expect(isValidHandleFormat("ร้าน")).toBe(false);
    expect(isValidHandleFormat("a_b")).toBe(false);
  });

  it("rejects a raw UUID (too long for a handle)", () => {
    expect(isValidHandleFormat("061ababe-d581-4dce-a6e9-d0f1b40f3de9")).toBe(
      false,
    );
  });
});

describe("isReservedHandle", () => {
  it("flags reserved words case-insensitively", () => {
    expect(isReservedHandle("register")).toBe(true);
    expect(isReservedHandle("REGISTER")).toBe(true);
    expect(isReservedHandle("Admin")).toBe(true);
    expect(isReservedHandle("api")).toBe(true);
  });

  it("allows ordinary handles", () => {
    expect(isReservedHandle("tukta-salon")).toBe(false);
    expect(isReservedHandle("registration-desk")).toBe(false);
  });
});
