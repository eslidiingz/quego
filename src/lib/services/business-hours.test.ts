import { describe, it, expect } from "vitest";
import { validate } from "./business-hours";
import type { BusinessHour } from "@/lib/booking/slot-math";

/**
 * Build a valid 7-day array (days 0..6). When `open` is true, every day is
 * open 09:00–18:00; otherwise every day is closed with null times. Callers
 * mutate individual days per-case.
 */
function buildWeek(open: boolean): BusinessHour[] {
  return Array.from({ length: 7 }, (_, day) => ({
    dayOfWeek: day,
    isOpen: open,
    openTime: open ? "09:00" : null,
    closeTime: open ? "18:00" : null,
  }));
}

describe("validate", () => {
  it("returns null for a valid all-closed week", () => {
    expect(validate(buildWeek(false))).toBeNull();
  });

  it("returns null for a valid all-open week", () => {
    expect(validate(buildWeek(true))).toBeNull();
  });

  it("rejects a week with fewer than 7 days", () => {
    const week = buildWeek(false).slice(0, 6);
    expect(validate(week)).toBe("ต้องระบุข้อมูลครบทั้ง 7 วัน");
  });

  it("rejects a duplicate dayOfWeek", () => {
    const week = buildWeek(false);
    week[1].dayOfWeek = 0; // now two days have dayOfWeek 0
    expect(validate(week)).toBe("ข้อมูลวันซ้ำกัน");
  });

  it("rejects an open day with a single-digit hour openTime", () => {
    const week = buildWeek(true);
    week[2].openTime = "9:00"; // needs 2-digit hour
    expect(validate(week)).toBe(`เวลาเปิดของวันที่ ${week[2].dayOfWeek} ไม่ถูกต้อง`);
  });

  it("rejects an open day with a non-aligned minute openTime", () => {
    const week = buildWeek(true);
    week[3].openTime = "09:05"; // minute must end in 0
    expect(validate(week)).toBe(`เวลาเปิดของวันที่ ${week[3].dayOfWeek} ไม่ถูกต้อง`);
  });

  it("rejects an open day with an out-of-range hour closeTime", () => {
    const week = buildWeek(true);
    week[4].closeTime = "24:00"; // hour must be 00-23
    expect(validate(week)).toBe(`เวลาปิดของวันที่ ${week[4].dayOfWeek} ไม่ถูกต้อง`);
  });

  it("accepts an open day with valid 09:00 open and 18:00 close", () => {
    const week = buildWeek(false);
    week[5] = { dayOfWeek: 5, isOpen: true, openTime: "09:00", closeTime: "18:00" };
    expect(validate(week)).toBeNull();
  });

  it("rejects an open day where openTime >= closeTime", () => {
    const week = buildWeek(true);
    week[6].openTime = "18:00";
    week[6].closeTime = "09:00";
    expect(validate(week)).toBe("เวลาเปิดต้องน้อยกว่าเวลาปิด");
  });

  it("does not validate time fields on a closed day with null times", () => {
    const week = buildWeek(true);
    // A closed day with null times must be skipped even amongst open days.
    week[0] = { dayOfWeek: 0, isOpen: false, openTime: null, closeTime: null };
    expect(validate(week)).toBeNull();
  });
});
