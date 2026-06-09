import { describe, it, expect } from "vitest";
import { formatBaht } from "@/lib/baht";

describe("formatBaht", () => {
  it("formats a small integer with no separators or decimals", () => {
    expect(formatBaht(350)).toBe("฿350");
  });

  it("groups thousands with a comma and keeps a single trailing decimal", () => {
    expect(formatBaht(1200.5)).toBe("฿1,200.5");
  });

  it("groups millions with comma separators", () => {
    expect(formatBaht(1000000)).toBe("฿1,000,000");
  });

  it("formats zero as ฿0", () => {
    expect(formatBaht(0)).toBe("฿0");
  });

  it("keeps two decimal places when present", () => {
    expect(formatBaht(99.99)).toBe("฿99.99");
  });

  it("rounds to a maximum of two fraction digits (99.999 → ฿100)", () => {
    expect(formatBaht(99.999)).toBe("฿100");
  });

  it("always starts with the ฿ symbol", () => {
    expect(formatBaht(0).startsWith("฿")).toBe(true);
    expect(formatBaht(350).startsWith("฿")).toBe(true);
    expect(formatBaht(1000000).startsWith("฿")).toBe(true);
  });
});
