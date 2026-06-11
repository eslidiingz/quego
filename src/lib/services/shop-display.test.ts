import { describe, it, expect } from "vitest";

import { maskCustomerName } from "./shop-display";

describe("maskCustomerName", () => {
  it("falls back to 'ลูกค้า' for a null name", () => {
    expect(maskCustomerName(null)).toBe("ลูกค้า");
  });

  it("falls back to 'ลูกค้า' for an empty string", () => {
    expect(maskCustomerName("")).toBe("ลูกค้า");
  });

  it("falls back to 'ลูกค้า' for a whitespace-only name", () => {
    expect(maskCustomerName("   ")).toBe("ลูกค้า");
  });

  it("leaves a single-token name unchanged", () => {
    expect(maskCustomerName("สมชาย")).toBe("สมชาย");
  });

  it("abbreviates the surname of a two-token name", () => {
    expect(maskCustomerName("สมชาย ใจดี")).toBe("สมชาย ใ.");
  });

  it("trims leading/trailing whitespace before masking", () => {
    expect(maskCustomerName("  สมชาย ใจดี  ")).toBe("สมชาย ใ.");
  });

  it("uses only the first two tokens for a three-token name", () => {
    expect(maskCustomerName("a b c")).toBe("a b.");
  });

  it("masks a Latin name", () => {
    expect(maskCustomerName("John Doe")).toBe("John D.");
  });
});
