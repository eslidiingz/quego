import { describe, it, expect } from "vitest";
import {
  parseRange,
  computeShopInsights,
  DEFAULT_INSIGHTS_RANGE,
  type InsightsBooking,
  type InsightsStaff,
} from "./aggregate";
import type { BusinessHour, DayOfWeek } from "@/lib/booking/slot-math";

// --- Fixture helpers ---------------------------------------------------------

/** Build one InsightsBooking; overrides win over the active 60-min default. */
function makeBooking(overrides: Partial<InsightsBooking> = {}): InsightsBooking {
  return {
    bookingDate: "2026-06-01",
    slotTime: "10:00",
    durationMinutes: 60,
    staffId: null,
    status: "confirmed",
    price: null,
    ...overrides,
  };
}

/**
 * Build a 7-entry BusinessHour array (index = dayOfWeek). By default every day
 * is open 09:00–17:00 (480 min). Pass per-day overrides keyed by dayOfWeek.
 */
function makeHours(
  overrides: Partial<Record<DayOfWeek, Partial<BusinessHour>>> = {},
): BusinessHour[] {
  return ([0, 1, 2, 3, 4, 5, 6] as DayOfWeek[]).map((dayOfWeek) => ({
    dayOfWeek,
    isOpen: true,
    openTime: "09:00",
    closeTime: "17:00",
    ...overrides[dayOfWeek],
  }));
}

/** Build a windowDates entry, deriving dayOfWeek from a literal. */
function day(dateYmd: string, dayOfWeek: DayOfWeek) {
  return { dateYmd, dayOfWeek };
}

function makeStaff(id: string, name: string): InsightsStaff {
  return { id, name };
}

// --- parseRange --------------------------------------------------------------

describe("parseRange", () => {
  it("maps the three valid string ranges to numbers", () => {
    expect(parseRange("7")).toBe(7);
    expect(parseRange("30")).toBe(30);
    expect(parseRange("90")).toBe(90);
  });

  it("falls back to the default (30) for undefined", () => {
    expect(parseRange(undefined)).toBe(30);
    expect(parseRange(undefined)).toBe(DEFAULT_INSIGHTS_RANGE);
  });

  it("falls back to the default for non-numeric input", () => {
    expect(parseRange("abc")).toBe(DEFAULT_INSIGHTS_RANGE);
  });

  it("falls back to the default for an empty string (Number('') === 0)", () => {
    expect(parseRange("")).toBe(DEFAULT_INSIGHTS_RANGE);
  });

  it("falls back to the default for numeric-but-invalid windows", () => {
    expect(parseRange("0")).toBe(DEFAULT_INSIGHTS_RANGE);
    expect(parseRange("15")).toBe(DEFAULT_INSIGHTS_RANGE);
  });
});

// --- computeShopInsights: lineMinutes & capacity -----------------------------

describe("computeShopInsights — lineMinutes & capacity", () => {
  it("sums each open day's span (close − open) across the window", () => {
    // Two days, both open 09:00–17:00 = 480 min each → 960.
    const result = computeShopInsights({
      rangeDays: 7,
      windowDates: [day("2026-06-01", 1), day("2026-06-02", 2)],
      hours: makeHours(),
      bookings: [],
      staff: [],
    });
    expect(result.lineMinutes).toBe(960);
  });

  it("contributes 0 for closed days and days with missing hours", () => {
    // Monday open 09:00–17:00 (480). Tuesday closed (isOpen=false → 0).
    // Sunday hours object marked open but with null times → 0.
    const result = computeShopInsights({
      rangeDays: 7,
      windowDates: [
        day("2026-06-01", 1), // open 480
        day("2026-06-02", 2), // closed
        day("2026-06-07", 0), // open flag but null times
      ],
      hours: makeHours({
        2: { isOpen: false, openTime: null, closeTime: null },
        0: { isOpen: true, openTime: null, closeTime: null },
      }),
      bookings: [],
      staff: [],
    });
    expect(result.lineMinutes).toBe(480);
  });

  it("ignores days whose span is non-positive (close <= open)", () => {
    // Day open 17:00–09:00 → span -480 (not > 0) → contributes 0.
    const result = computeShopInsights({
      rangeDays: 7,
      windowDates: [day("2026-06-01", 1)],
      hours: makeHours({ 1: { openTime: "17:00", closeTime: "09:00" } }),
      bookings: [],
      staff: [],
    });
    expect(result.lineMinutes).toBe(0);
  });

  it("derives capacity = max(staff.length, 1) and availableCapacityMin via fillRate", () => {
    // 1 open day = 480 lineMinutes. 2 staff → capacity 2 → available 960.
    // bookedMin: one 240-min active booking → fill = 240/960 = 0.25.
    const result = computeShopInsights({
      rangeDays: 7,
      windowDates: [day("2026-06-01", 1)],
      hours: makeHours(),
      bookings: [makeBooking({ durationMinutes: 240 })],
      staff: [makeStaff("s1", "A"), makeStaff("s2", "B")],
    });
    expect(result.lineMinutes).toBe(480);
    expect(result.capacity).toBe(2);
    expect(result.fillRate).toBeCloseTo(0.25, 10);
  });

  it("uses capacity 1 when there is no staff", () => {
    const result = computeShopInsights({
      rangeDays: 7,
      windowDates: [day("2026-06-01", 1)],
      hours: makeHours(),
      bookings: [],
      staff: [],
    });
    expect(result.capacity).toBe(1);
  });
});

// --- computeShopInsights: totalBookings --------------------------------------

describe("computeShopInsights — totalBookings", () => {
  it("counts confirmed and completed but not cancelled", () => {
    const result = computeShopInsights({
      rangeDays: 7,
      windowDates: [day("2026-06-01", 1)],
      hours: makeHours(),
      bookings: [
        makeBooking({ status: "confirmed" }),
        makeBooking({ status: "completed" }),
        makeBooking({ status: "cancelled" }),
        makeBooking({ status: "cancelled" }),
      ],
      staff: [],
    });
    expect(result.totalBookings).toBe(2);
  });
});

// --- computeShopInsights: fillRate -------------------------------------------

describe("computeShopInsights — fillRate", () => {
  it("is bookedMinutes / availableCapacityMin for active bookings only", () => {
    // 1 open day = 480, no staff → capacity 1 → available 480.
    // Active: 60 + 120 = 180. Cancelled 300 excluded. fill = 180/480 = 0.375.
    const result = computeShopInsights({
      rangeDays: 7,
      windowDates: [day("2026-06-01", 1)],
      hours: makeHours(),
      bookings: [
        makeBooking({ durationMinutes: 60, status: "confirmed" }),
        makeBooking({ durationMinutes: 120, status: "completed" }),
        makeBooking({ durationMinutes: 300, status: "cancelled" }),
      ],
      staff: [],
    });
    expect(result.fillRate).toBeCloseTo(0.375, 10);
  });

  it("caps at 1 when overbooked beyond available capacity", () => {
    // available = 480. booked = 600 > 480 → min(1, 1.25) = 1.
    const result = computeShopInsights({
      rangeDays: 7,
      windowDates: [day("2026-06-01", 1)],
      hours: makeHours(),
      bookings: [makeBooking({ durationMinutes: 600 })],
      staff: [],
    });
    expect(result.fillRate).toBe(1);
  });

  it("is 0 when availableCapacityMin is 0 (no open minutes), even with bookings", () => {
    const result = computeShopInsights({
      rangeDays: 7,
      windowDates: [day("2026-06-02", 2)],
      hours: makeHours({ 2: { isOpen: false, openTime: null, closeTime: null } }),
      bookings: [makeBooking({ durationMinutes: 60 })],
      staff: [],
    });
    expect(result.lineMinutes).toBe(0);
    expect(result.fillRate).toBe(0);
  });
});

// --- computeShopInsights: cancellationRate -----------------------------------

describe("computeShopInsights — cancellationRate", () => {
  it("is cancelled / (active + cancelled)", () => {
    // active 3, cancelled 1 → 1/4 = 0.25.
    const result = computeShopInsights({
      rangeDays: 7,
      windowDates: [day("2026-06-01", 1)],
      hours: makeHours(),
      bookings: [
        makeBooking({ status: "confirmed" }),
        makeBooking({ status: "completed" }),
        makeBooking({ status: "confirmed" }),
        makeBooking({ status: "cancelled" }),
      ],
      staff: [],
    });
    expect(result.cancellationRate).toBeCloseTo(0.25, 10);
  });

  it("is 0 when there are no bookings at all", () => {
    const result = computeShopInsights({
      rangeDays: 7,
      windowDates: [day("2026-06-01", 1)],
      hours: makeHours(),
      bookings: [],
      staff: [],
    });
    expect(result.cancellationRate).toBe(0);
  });
});

// --- computeShopInsights: revenue --------------------------------------------

describe("computeShopInsights — revenue", () => {
  it("sums price of active bookings, excluding cancelled and null prices", () => {
    // Active priced: 250 + 400 = 650. Null price active → excluded.
    // Cancelled with price 999 → excluded.
    const result = computeShopInsights({
      rangeDays: 7,
      windowDates: [day("2026-06-01", 1)],
      hours: makeHours(),
      bookings: [
        makeBooking({ status: "confirmed", price: 250 }),
        makeBooking({ status: "completed", price: 400 }),
        makeBooking({ status: "confirmed", price: null }),
        makeBooking({ status: "cancelled", price: 999 }),
      ],
      staff: [],
    });
    expect(result.revenue).toBe(650);
  });

  it("counts a price of 0 as revenue (only null is excluded)", () => {
    const result = computeShopInsights({
      rangeDays: 7,
      windowDates: [day("2026-06-01", 1)],
      hours: makeHours(),
      bookings: [makeBooking({ status: "confirmed", price: 0 })],
      staff: [],
    });
    expect(result.revenue).toBe(0);
  });
});

// --- computeShopInsights: busyByHour & peakHour ------------------------------

describe("computeShopInsights — busyByHour & peakHour", () => {
  it("spans floor(earliest open) … ceil(latest close) when hours exist, bucketing active bookings", () => {
    // All days 09:00–17:00 → buckets hours 9..16 inclusive (ceil(17:00)=17,
    // exclusive end) = 8 buckets.
    // Active bookings: two at 10:xx, one at 12:30. Cancelled at 10:00 excluded.
    const result = computeShopInsights({
      rangeDays: 7,
      windowDates: [day("2026-06-01", 1)],
      hours: makeHours(),
      bookings: [
        makeBooking({ slotTime: "10:00", status: "confirmed" }),
        makeBooking({ slotTime: "10:45", status: "completed" }),
        makeBooking({ slotTime: "12:30", status: "confirmed" }),
        makeBooking({ slotTime: "10:00", status: "cancelled" }),
      ],
      staff: [],
    });
    expect(result.busyByHour).toEqual([
      { hour: 9, count: 0 },
      { hour: 10, count: 2 },
      { hour: 11, count: 0 },
      { hour: 12, count: 1 },
      { hour: 13, count: 0 },
      { hour: 14, count: 0 },
      { hour: 15, count: 0 },
      { hour: 16, count: 0 },
    ]);
    expect(result.peakHour).toBe(10);
  });

  it("rounds the close hour up so a partial last hour shows (08:30–17:30)", () => {
    // floor(08:30)=8, ceil(17:30)=18 → hours 8..17 inclusive = 10 buckets.
    const result = computeShopInsights({
      rangeDays: 7,
      windowDates: [day("2026-06-01", 1)],
      hours: makeHours({ 1: { openTime: "08:30", closeTime: "17:30" } }),
      bookings: [makeBooking({ slotTime: "08:45" })],
      staff: [],
    });
    expect(result.busyByHour.map((b) => b.hour)).toEqual([
      8, 9, 10, 11, 12, 13, 14, 15, 16, 17,
    ]);
    expect(result.busyByHour[0]).toEqual({ hour: 8, count: 1 });
    expect(result.peakHour).toBe(8);
  });

  it("spans the widest open hours across all weekdays (min open … max close)", () => {
    // Day 1 open 09:00–12:00, Day 2 open 14:00–20:00. All other days default
    // 09:00–17:00 still count toward the span. Widest = floor(09:00)=9 …
    // ceil(20:00)=20 → hours 9..19 = 11 buckets.
    const result = computeShopInsights({
      rangeDays: 7,
      windowDates: [day("2026-06-01", 1)],
      hours: makeHours({
        1: { openTime: "09:00", closeTime: "12:00" },
        2: { openTime: "14:00", closeTime: "20:00" },
      }),
      bookings: [],
      staff: [],
    });
    expect(result.busyByHour.map((b) => b.hour)).toEqual([
      9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
    ]);
  });

  it("falls back to only data-bearing hours when no business hours are configured", () => {
    // No open day in hours → fallback path: only hours with count>0, ascending.
    const closedHours = makeHours();
    for (let d = 0 as DayOfWeek; d <= 6; d = (d + 1) as DayOfWeek) {
      closedHours[d] = { dayOfWeek: d, isOpen: false, openTime: null, closeTime: null };
    }
    const result = computeShopInsights({
      rangeDays: 7,
      windowDates: [day("2026-06-01", 1)],
      hours: closedHours,
      bookings: [
        makeBooking({ slotTime: "09:15", status: "confirmed" }),
        makeBooking({ slotTime: "09:50", status: "confirmed" }),
        makeBooking({ slotTime: "15:00", status: "completed" }),
        makeBooking({ slotTime: "15:00", status: "cancelled" }),
      ],
      staff: [],
    });
    expect(result.busyByHour).toEqual([
      { hour: 9, count: 2 },
      { hour: 15, count: 1 },
    ]);
    expect(result.peakHour).toBe(9);
  });

  it("returns peakHour null when busyByHour has no positive counts (open hours, no bookings)", () => {
    const result = computeShopInsights({
      rangeDays: 7,
      windowDates: [day("2026-06-01", 1)],
      hours: makeHours(),
      bookings: [],
      staff: [],
    });
    expect(result.busyByHour.every((b) => b.count === 0)).toBe(true);
    expect(result.peakHour).toBeNull();
  });

  it("returns the first hour on a tie (strict-greater comparison)", () => {
    // 11:00 and 14:00 each have 1 active booking → first max (11) wins.
    const result = computeShopInsights({
      rangeDays: 7,
      windowDates: [day("2026-06-01", 1)],
      hours: makeHours(),
      bookings: [
        makeBooking({ slotTime: "11:00" }),
        makeBooking({ slotTime: "14:00" }),
      ],
      staff: [],
    });
    expect(result.peakHour).toBe(11);
  });
});

// --- computeShopInsights: staff utilization ----------------------------------

describe("computeShopInsights — staff utilization", () => {
  it("emits one row per staff sorted by utilization desc", () => {
    // 1 open day = 480 lineMinutes.
    // s1: 120 min → 0.25. s2: 360 min → 0.75. Sorted: s2 first.
    const result = computeShopInsights({
      rangeDays: 7,
      windowDates: [day("2026-06-01", 1)],
      hours: makeHours(),
      bookings: [
        makeBooking({ staffId: "s1", durationMinutes: 120 }),
        makeBooking({ staffId: "s2", durationMinutes: 360 }),
      ],
      staff: [makeStaff("s1", "ช่างเอ"), makeStaff("s2", "ช่างบี")],
    });
    expect(result.staff).toEqual([
      { staffId: "s2", name: "ช่างบี", bookedMinutes: 360, utilization: 0.75 },
      { staffId: "s1", name: "ช่างเอ", bookedMinutes: 120, utilization: 0.25 },
    ]);
  });

  it("caps a staff member's utilization at 1 when overbooked", () => {
    // 480 lineMinutes; s1 booked 720 → min(1, 1.5) = 1.
    const result = computeShopInsights({
      rangeDays: 7,
      windowDates: [day("2026-06-01", 1)],
      hours: makeHours(),
      bookings: [makeBooking({ staffId: "s1", durationMinutes: 720 })],
      staff: [makeStaff("s1", "ช่างเอ")],
    });
    expect(result.staff[0].utilization).toBe(1);
  });

  it("zeroes a staff member with no bookings", () => {
    const result = computeShopInsights({
      rangeDays: 7,
      windowDates: [day("2026-06-01", 1)],
      hours: makeHours(),
      bookings: [],
      staff: [makeStaff("s1", "ช่างเอ")],
    });
    expect(result.staff).toEqual([
      { staffId: "s1", name: "ช่างเอ", bookedMinutes: 0, utilization: 0 },
    ]);
  });

  it("appends a 'ไม่ระบุพนักงาน' trailing row only when null-staff minutes > 0", () => {
    // 480 lineMinutes. s1: 240 → 0.5. null-staff legacy: 120 → 0.25.
    const result = computeShopInsights({
      rangeDays: 7,
      windowDates: [day("2026-06-01", 1)],
      hours: makeHours(),
      bookings: [
        makeBooking({ staffId: "s1", durationMinutes: 240 }),
        makeBooking({ staffId: null, durationMinutes: 120 }),
      ],
      staff: [makeStaff("s1", "ช่างเอ")],
    });
    expect(result.staff).toEqual([
      { staffId: "s1", name: "ช่างเอ", bookedMinutes: 240, utilization: 0.5 },
      { staffId: null, name: "ไม่ระบุพนักงาน", bookedMinutes: 120, utilization: 0.25 },
    ]);
  });

  it("omits the trailing null-staff row when there are no null-staff minutes", () => {
    const result = computeShopInsights({
      rangeDays: 7,
      windowDates: [day("2026-06-01", 1)],
      hours: makeHours(),
      bookings: [makeBooking({ staffId: "s1", durationMinutes: 240 })],
      staff: [makeStaff("s1", "ช่างเอ")],
    });
    expect(result.staff).toHaveLength(1);
    expect(result.staff.every((r) => r.staffId !== null)).toBe(true);
  });

  it("does NOT count cancelled bookings toward staff minutes", () => {
    // Only the 200-min active booking counts; cancelled 999 excluded.
    const result = computeShopInsights({
      rangeDays: 7,
      windowDates: [day("2026-06-01", 1)],
      hours: makeHours(),
      bookings: [
        makeBooking({ staffId: "s1", durationMinutes: 200, status: "confirmed" }),
        makeBooking({ staffId: "s1", durationMinutes: 999, status: "cancelled" }),
      ],
      staff: [makeStaff("s1", "ช่างเอ")],
    });
    expect(result.staff[0].bookedMinutes).toBe(200);
  });

  it("aggregates all null-staff minutes into a single 'คิวรวม (ไม่ระบุพนักงาน)' row when there is no staff", () => {
    // 480 lineMinutes, no staff. null-staff active: 60 + 180 = 240 → 0.5.
    const result = computeShopInsights({
      rangeDays: 7,
      windowDates: [day("2026-06-01", 1)],
      hours: makeHours(),
      bookings: [
        makeBooking({ staffId: null, durationMinutes: 60 }),
        makeBooking({ staffId: null, durationMinutes: 180 }),
        makeBooking({ staffId: null, durationMinutes: 30, status: "cancelled" }),
      ],
      staff: [],
    });
    expect(result.staff).toEqual([
      {
        staffId: null,
        name: "คิวรวม (ไม่ระบุพนักงาน)",
        bookedMinutes: 240,
        utilization: 0.5,
      },
    ]);
  });

  it("zeroes staff utilization when lineMinutes is 0", () => {
    const result = computeShopInsights({
      rangeDays: 7,
      windowDates: [day("2026-06-02", 2)],
      hours: makeHours({ 2: { isOpen: false, openTime: null, closeTime: null } }),
      bookings: [makeBooking({ staffId: "s1", durationMinutes: 200 })],
      staff: [makeStaff("s1", "ช่างเอ")],
    });
    expect(result.lineMinutes).toBe(0);
    expect(result.staff[0]).toEqual({
      staffId: "s1",
      name: "ช่างเอ",
      bookedMinutes: 200,
      utilization: 0,
    });
  });
});

// --- computeShopInsights: hasData, window bounds, passthrough ----------------

describe("computeShopInsights — hasData & window bounds", () => {
  it("hasData is false only when there are zero bookings (active and cancelled)", () => {
    const result = computeShopInsights({
      rangeDays: 7,
      windowDates: [day("2026-06-01", 1)],
      hours: makeHours(),
      bookings: [],
      staff: [],
    });
    expect(result.hasData).toBe(false);
  });

  it("hasData is true when only cancelled bookings exist", () => {
    const result = computeShopInsights({
      rangeDays: 7,
      windowDates: [day("2026-06-01", 1)],
      hours: makeHours(),
      bookings: [makeBooking({ status: "cancelled" })],
      staff: [],
    });
    expect(result.totalBookings).toBe(0);
    expect(result.hasData).toBe(true);
  });

  it("sets windowStart/windowEnd to the first/last windowDates dateYmd", () => {
    const result = computeShopInsights({
      rangeDays: 7,
      windowDates: [
        day("2026-06-01", 1),
        day("2026-06-02", 2),
        day("2026-06-03", 3),
      ],
      hours: makeHours(),
      bookings: [],
      staff: [],
    });
    expect(result.windowStart).toBe("2026-06-01");
    expect(result.windowEnd).toBe("2026-06-03");
  });

  it("passes rangeDays through unchanged", () => {
    const result = computeShopInsights({
      rangeDays: 90,
      windowDates: [day("2026-06-01", 1)],
      hours: makeHours(),
      bookings: [],
      staff: [],
    });
    expect(result.rangeDays).toBe(90);
  });

  it("handles fully empty input: zeros, hasData false, peakHour null, empty window", () => {
    const result = computeShopInsights({
      rangeDays: 30,
      windowDates: [],
      hours: [],
      bookings: [],
      staff: [],
    });
    expect(result).toEqual({
      rangeDays: 30,
      windowStart: "",
      windowEnd: "",
      totalBookings: 0,
      fillRate: 0,
      cancellationRate: 0,
      revenue: 0,
      lineMinutes: 0,
      capacity: 1,
      busyByHour: [],
      peakHour: null,
      staff: [
        {
          staffId: null,
          name: "คิวรวม (ไม่ระบุพนักงาน)",
          bookedMinutes: 0,
          utilization: 0,
        },
      ],
      hasData: false,
    });
  });
});
