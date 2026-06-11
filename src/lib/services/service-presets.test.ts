import { describe, it, expect } from "vitest";
import { toPrice, normalize } from "./service-presets";

describe("toPrice", () => {
  it("returns null for null", () => {
    expect(toPrice(null)).toBeNull();
  });

  it("coerces a numeric string to a number", () => {
    expect(toPrice("150.50")).toBe(150.5);
  });

  it("passes a plain number through unchanged", () => {
    expect(toPrice(42)).toBe(42);
    expect(toPrice(0)).toBe(0);
  });

  it("returns null for non-finite garbage strings (NaN)", () => {
    expect(toPrice("abc")).toBeNull();
  });

  it("returns null for non-finite numbers", () => {
    expect(toPrice(Infinity)).toBeNull();
    expect(toPrice(NaN)).toBeNull();
  });
});

describe("normalize", () => {
  const base = {
    name: "ตัดผม",
    description: null,
    durationMinutes: 30,
    price: null,
  };

  it("accepts a valid minimal input", () => {
    expect(normalize(base)).toEqual({
      name: "ตัดผม",
      description: null,
      durationMinutes: 30,
      price: null,
    });
  });

  // ----- name -----
  it("rejects an empty name", () => {
    expect(normalize({ ...base, name: "" })).toBeNull();
  });

  it("rejects a whitespace-only name", () => {
    expect(normalize({ ...base, name: "   " })).toBeNull();
  });

  it("rejects a name longer than 120 chars", () => {
    expect(normalize({ ...base, name: "a".repeat(121) })).toBeNull();
  });

  it("accepts a name of exactly 120 chars", () => {
    const name = "a".repeat(120);
    expect(normalize({ ...base, name })).toEqual({
      name,
      description: null,
      durationMinutes: 30,
      price: null,
    });
  });

  it("trims the name", () => {
    expect(normalize({ ...base, name: "  ตัดผม  " })?.name).toBe("ตัดผม");
  });

  // ----- durationMinutes -----
  it("rejects duration of 9 (below minimum)", () => {
    expect(normalize({ ...base, durationMinutes: 9 })).toBeNull();
  });

  it("accepts duration of 10 (minimum)", () => {
    expect(normalize({ ...base, durationMinutes: 10 })?.durationMinutes).toBe(
      10,
    );
  });

  it("accepts duration of 480 (maximum)", () => {
    expect(normalize({ ...base, durationMinutes: 480 })?.durationMinutes).toBe(
      480,
    );
  });

  it("rejects duration of 481 (above maximum)", () => {
    expect(normalize({ ...base, durationMinutes: 481 })).toBeNull();
  });

  it("rejects duration of 15 (not a multiple of 10)", () => {
    expect(normalize({ ...base, durationMinutes: 15 })).toBeNull();
  });

  it("rejects non-integer duration", () => {
    expect(normalize({ ...base, durationMinutes: 30.5 })).toBeNull();
  });

  // ----- price -----
  it("keeps price null when input price is null", () => {
    expect(normalize({ ...base, price: null })?.price).toBeNull();
  });

  it("rejects a negative price", () => {
    expect(normalize({ ...base, price: -1 })).toBeNull();
  });

  it("accepts a price of 0", () => {
    expect(normalize({ ...base, price: 0 })?.price).toBe(0);
  });

  it("rounds price to 2 decimals (99.999 -> 100)", () => {
    expect(normalize({ ...base, price: 99.999 })?.price).toBe(100);
  });

  it("passes a clean 2-decimal price through", () => {
    expect(normalize({ ...base, price: 150.5 })?.price).toBe(150.5);
  });

  it("rejects a non-finite price (Infinity)", () => {
    expect(normalize({ ...base, price: Infinity })).toBeNull();
  });

  // ----- description -----
  it("treats undefined description as null", () => {
    const { description: _omit, ...noDesc } = base;
    expect(normalize(noDesc)?.description).toBeNull();
  });

  it("treats null description as null", () => {
    expect(normalize({ ...base, description: null })?.description).toBeNull();
  });

  it("trims a description", () => {
    expect(normalize({ ...base, description: "  x  " })?.description).toBe("x");
  });

  it("treats an empty-after-trim description as null", () => {
    expect(normalize({ ...base, description: "   " })?.description).toBeNull();
  });

  it("rejects a description longer than 500 chars", () => {
    expect(normalize({ ...base, description: "a".repeat(501) })).toBeNull();
  });
});
