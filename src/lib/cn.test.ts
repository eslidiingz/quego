import { describe, it, expect } from "vitest";
import { cn } from "@/lib/cn";

describe("cn standard twMerge conflict resolution", () => {
  it("keeps the last padding utility when two of the same axis collide", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("collapses conflicting standard font sizes to the last one", () => {
    expect(cn("text-sm", "text-lg")).toBe("text-lg");
  });
});

describe("cn custom typography tokens (the documented gotcha)", () => {
  it("keeps BOTH a custom font-size token and a color token (color must not be dropped)", () => {
    const out = cn("text-body-md", "text-on-primary");
    expect(out).toContain("text-body-md");
    expect(out).toContain("text-on-primary");
  });

  it("collapses two custom font-size tokens to the last one", () => {
    const out = cn("text-body-md", "text-display-lg");
    expect(out).toContain("text-display-lg");
    expect(out).not.toContain("text-body-md");
  });
});

describe("cn clsx input handling", () => {
  it("drops falsy entries and keeps truthy conditional classes", () => {
    expect(cn("a", false && "b", null, undefined, true && "c")).toBe("a c");
  });

  it("merges array inputs", () => {
    expect(cn(["x", "y"])).toBe("x y");
  });
});
