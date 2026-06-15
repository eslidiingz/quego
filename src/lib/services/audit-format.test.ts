import { describe, it, expect } from "vitest";
import {
  thaiActionLabel,
  thaiEntityLabel,
  formatMetaSummary,
} from "./audit-format";

describe("thaiActionLabel", () => {
  it("maps every known action to a non-empty Thai label", () => {
    const known = [
      "shop.update",
      "shop.impersonate",
      "category.create",
      "category.update",
      "category.delete",
      "preset.create",
      "preset.update",
      "preset.toggle_active",
      "preset.delete",
    ];
    for (const action of known) {
      const label = thaiActionLabel(action);
      expect(label.length).toBeGreaterThan(0);
      expect(label).not.toBe("การกระทำอื่น");
    }
  });

  it("returns distinct labels for distinct actions", () => {
    expect(thaiActionLabel("shop.update")).not.toBe(
      thaiActionLabel("shop.impersonate"),
    );
    expect(thaiActionLabel("category.create")).not.toBe(
      thaiActionLabel("preset.create"),
    );
  });

  it("maps specific actions to their expected Thai copy", () => {
    expect(thaiActionLabel("shop.update")).toBe("แก้ไขข้อมูลร้าน");
    expect(thaiActionLabel("preset.toggle_active")).toBe(
      "เปิด/ปิดบริการ preset",
    );
  });

  it("falls back to a generic label for unknown / legacy codes", () => {
    expect(thaiActionLabel("shop.frobnicate")).toBe("การกระทำอื่น");
    expect(thaiActionLabel("")).toBe("การกระทำอื่น");
    expect(thaiActionLabel("totally-unknown")).toBe("การกระทำอื่น");
  });
});

describe("thaiEntityLabel", () => {
  it("maps known entity types to Thai labels", () => {
    expect(thaiEntityLabel("shop")).toBe("ร้าน");
    expect(thaiEntityLabel("category")).toBe("หมวดหมู่");
    expect(thaiEntityLabel("preset")).toBe("บริการ preset");
  });

  it("falls back for unknown entity types", () => {
    expect(thaiEntityLabel("widget")).toBe("อื่น ๆ");
    expect(thaiEntityLabel("")).toBe("อื่น ๆ");
  });
});

describe("formatMetaSummary", () => {
  it("returns null for null/undefined/empty meta", () => {
    expect(formatMetaSummary(null)).toBeNull();
    expect(formatMetaSummary(undefined)).toBeNull();
    expect(formatMetaSummary({})).toBeNull();
  });

  it("skips null/undefined/empty-string values", () => {
    expect(
      formatMetaSummary({ reason: null, note: undefined, blank: "" }),
    ).toBeNull();
  });

  it("renders key:value pairs joined by a separator", () => {
    expect(formatMetaSummary({ reason: "ข้อมูลไม่ครบ" })).toBe(
      "reason: ข้อมูลไม่ครบ",
    );
    expect(
      formatMetaSummary({ shopName: "ร้านสวย", count: 3 }),
    ).toBe("shopName: ร้านสวย · count: 3");
  });

  it("coerces booleans and numbers to strings", () => {
    expect(formatMetaSummary({ active: true, n: 0 })).toBe("active: true · n: 0");
  });

  it("JSON-encodes nested objects/arrays without throwing", () => {
    expect(formatMetaSummary({ tags: ["a", "b"] })).toBe('tags: ["a","b"]');
    expect(formatMetaSummary({ obj: { x: 1 } })).toBe('obj: {"x":1}');
  });
});
