import { describe, it, expect } from "vitest";
import {
  parseRange,
  parseReportRange,
  serializeReportRange,
  computeShopInsights,
  DEFAULT_INSIGHTS_RANGE,
  type InsightsBooking,
  type InsightsStaff,
  type InsightsService,
  type InsightsExpense,
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
    serviceId: null,
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

function makeService(id: string, name: string): InsightsService {
  return { id, name };
}

/** Build one InsightsExpense; overrides win over the active defaults. */
function makeExpense(overrides: Partial<InsightsExpense> = {}): InsightsExpense {
  return {
    expenseDate: "2026-06-01",
    category: "อื่นๆ",
    amount: 100,
    ...overrides,
  };
}

describe("computeShopInsights — expenses, net profit & margin", () => {
  const base = {
    rangeDays: 1,
    windowDates: [day("2026-06-01", 1)],
    hours: makeHours(),
    staff: [] as InsightsStaff[],
    services: [] as InsightsService[],
  };

  it("sums expenses, computes net profit and margin", () => {
    const result = computeShopInsights({
      ...base,
      bookings: [makeBooking({ price: 1000, status: "completed" })],
      expenses: [
        makeExpense({ category: "ค่าเช่าร้าน", amount: 300 }),
        makeExpense({ category: "ค่าอุปกรณ์/วัสดุ", amount: 200 }),
      ],
    });
    expect(result.revenue).toBe(1000);
    expect(result.expensesTotal).toBe(500);
    expect(result.netProfit).toBe(500);
    expect(result.profitMargin).toBeCloseTo(0.5);
  });

  it("returns a negative net profit and null margin when there is no revenue", () => {
    const result = computeShopInsights({
      ...base,
      bookings: [],
      expenses: [makeExpense({ amount: 250 })],
    });
    expect(result.revenue).toBe(0);
    expect(result.expensesTotal).toBe(250);
    expect(result.netProfit).toBe(-250);
    expect(result.profitMargin).toBeNull();
  });

  it("groups expenses by category, ranked by amount desc", () => {
    const result = computeShopInsights({
      ...base,
      bookings: [],
      expenses: [
        makeExpense({ category: "ค่าเช่าร้าน", amount: 100 }),
        makeExpense({ category: "ค่าเช่าร้าน", amount: 50 }),
        makeExpense({ category: "ค่าพนักงาน", amount: 400 }),
      ],
    });
    expect(result.expensesByCategory).toEqual([
      { category: "ค่าพนักงาน", amount: 400, count: 1 },
      { category: "ค่าเช่าร้าน", amount: 150, count: 2 },
    ]);
  });

  it("folds a blank category into ไม่ระบุหมวด", () => {
    const result = computeShopInsights({
      ...base,
      bookings: [],
      expenses: [makeExpense({ category: "  ", amount: 75 })],
    });
    expect(result.expensesByCategory).toEqual([
      { category: "ไม่ระบุหมวด", amount: 75, count: 1 },
    ]);
  });

  it("defaults to zero expenses when none are supplied", () => {
    const result = computeShopInsights({
      ...base,
      bookings: [makeBooking({ price: 100, status: "completed" })],
    });
    expect(result.expensesTotal).toBe(0);
    expect(result.netProfit).toBe(100);
    expect(result.profitMargin).toBe(1);
    expect(result.expensesByCategory).toEqual([]);
  });
});

// --- parseRange --------------------------------------------------------------

describe("parseRange", () => {
  it("accepts the five valid range keys verbatim", () => {
    expect(parseRange("7")).toBe("7");
    expect(parseRange("30")).toBe("30");
    expect(parseRange("90")).toBe("90");
    expect(parseRange("month")).toBe("month");
    expect(parseRange("year")).toBe("year");
  });

  it("falls back to the default (30) for undefined", () => {
    expect(parseRange(undefined)).toBe("30");
    expect(parseRange(undefined)).toBe(DEFAULT_INSIGHTS_RANGE);
  });

  it("falls back to the default for unknown input", () => {
    expect(parseRange("abc")).toBe(DEFAULT_INSIGHTS_RANGE);
  });

  it("falls back to the default for the retired 'lastmonth' key", () => {
    expect(parseRange("lastmonth")).toBe(DEFAULT_INSIGHTS_RANGE);
  });

  it("falls back to the default for an empty string", () => {
    expect(parseRange("")).toBe(DEFAULT_INSIGHTS_RANGE);
  });

  it("falls back to the default for numeric-but-invalid windows", () => {
    expect(parseRange("0")).toBe(DEFAULT_INSIGHTS_RANGE);
    expect(parseRange("15")).toBe(DEFAULT_INSIGHTS_RANGE);
  });
});

// --- parseReportRange / serializeReportRange ---------------------------------

describe("parseReportRange", () => {
  it("parses preset tokens to a preset selection", () => {
    expect(parseReportRange("7")).toEqual({ kind: "preset", preset: "7" });
    expect(parseReportRange("month")).toEqual({ kind: "preset", preset: "month" });
    expect(parseReportRange("year")).toEqual({ kind: "preset", preset: "year" });
  });

  it("parses a YYYY-MM token to a month selection", () => {
    expect(parseReportRange("2026-06")).toEqual({
      kind: "month",
      year: 2026,
      month: 6,
    });
    expect(parseReportRange("2025-01")).toEqual({
      kind: "month",
      year: 2025,
      month: 1,
    });
  });

  it("parses a YYYY token to a year selection", () => {
    expect(parseReportRange("2026")).toEqual({ kind: "year", year: 2026 });
  });

  it("rejects an out-of-range month and falls back to the default preset", () => {
    expect(parseReportRange("2026-00")).toEqual({
      kind: "preset",
      preset: DEFAULT_INSIGHTS_RANGE,
    });
    expect(parseReportRange("2026-13")).toEqual({
      kind: "preset",
      preset: DEFAULT_INSIGHTS_RANGE,
    });
  });

  it("rejects an out-of-range year and falls back to the default preset", () => {
    expect(parseReportRange("1999")).toEqual({
      kind: "preset",
      preset: DEFAULT_INSIGHTS_RANGE,
    });
    expect(parseReportRange("3001")).toEqual({
      kind: "preset",
      preset: DEFAULT_INSIGHTS_RANGE,
    });
  });

  it("falls back to the default preset for garbage and undefined", () => {
    expect(parseReportRange("abc")).toEqual({
      kind: "preset",
      preset: DEFAULT_INSIGHTS_RANGE,
    });
    expect(parseReportRange(undefined)).toEqual({
      kind: "preset",
      preset: DEFAULT_INSIGHTS_RANGE,
    });
  });

  it("round-trips through serializeReportRange", () => {
    for (const token of ["7", "30", "90", "month", "year", "2026-06", "2024"]) {
      expect(serializeReportRange(parseReportRange(token))).toBe(token);
    }
  });
});

// --- computeShopInsights: lineMinutes & capacity -----------------------------

describe("computeShopInsights — lineMinutes & capacity", () => {
  it("sums each open day's span (close − open) across the window", () => {
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
    const result = computeShopInsights({
      rangeDays: 7,
      windowDates: [day("2026-06-01", 1)],
      hours: makeHours(),
      bookings: [makeBooking({ staffId: "s1", durationMinutes: 240 })],
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

// --- computeShopInsights: revenue & avgTicket --------------------------------

describe("computeShopInsights — revenue & avgTicket", () => {
  it("sums price of active bookings, excluding cancelled and null prices", () => {
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

  it("avgTicket = revenue / active booking count (counts null-priced bookings in the denominator)", () => {
    // 3 active bookings (one null-priced), revenue 250+400 = 650 → 650/3 ≈ 216.67.
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
    expect(result.totalBookings).toBe(3);
    expect(result.avgTicket).toBeCloseTo(650 / 3, 10);
  });

  it("avgTicket is 0 when there are no active bookings", () => {
    const result = computeShopInsights({
      rangeDays: 7,
      windowDates: [day("2026-06-01", 1)],
      hours: makeHours(),
      bookings: [makeBooking({ status: "cancelled", price: 500 })],
      staff: [],
    });
    expect(result.avgTicket).toBe(0);
  });
});

// --- computeShopInsights: busyByHour & peakHour ------------------------------

describe("computeShopInsights — busyByHour & peakHour", () => {
  it("spans floor(earliest open) … ceil(latest close) when hours exist, bucketing active bookings", () => {
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

  it("falls back to only data-bearing hours when no business hours are configured", () => {
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

  it("returns peakHour null when busyByHour has no positive counts", () => {
    const result = computeShopInsights({
      rangeDays: 7,
      windowDates: [day("2026-06-01", 1)],
      hours: makeHours(),
      bookings: [],
      staff: [],
    });
    expect(result.peakHour).toBeNull();
  });

  it("returns the first hour on a tie (strict-greater comparison)", () => {
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

// --- computeShopInsights: revenueByStaff -------------------------------------

describe("computeShopInsights — revenueByStaff", () => {
  it("emits one row per staff sorted by REVENUE desc (not utilization)", () => {
    // s1: 1 booking, 120 min, ฿900. s2: 1 booking, 360 min, ฿300.
    // Utilization would rank s2 first; revenue ranks s1 first.
    const result = computeShopInsights({
      rangeDays: 7,
      windowDates: [day("2026-06-01", 1)],
      hours: makeHours(),
      bookings: [
        makeBooking({ staffId: "s1", durationMinutes: 120, price: 900 }),
        makeBooking({ staffId: "s2", durationMinutes: 360, price: 300 }),
      ],
      staff: [makeStaff("s1", "ช่างเอ"), makeStaff("s2", "ช่างบี")],
    });
    expect(result.revenueByStaff).toEqual([
      { staffId: "s1", name: "ช่างเอ", revenue: 900, bookingCount: 1 },
      { staffId: "s2", name: "ช่างบี", revenue: 300, bookingCount: 1 },
    ]);
  });

  it("counts a null-priced active booking in bookingCount but not in revenue", () => {
    const result = computeShopInsights({
      rangeDays: 7,
      windowDates: [day("2026-06-01", 1)],
      hours: makeHours(),
      bookings: [
        makeBooking({ staffId: "s1", price: 500 }),
        makeBooking({ staffId: "s1", price: null }),
      ],
      staff: [makeStaff("s1", "ช่างเอ")],
    });
    expect(result.revenueByStaff[0]).toMatchObject({
      revenue: 500,
      bookingCount: 2,
    });
  });

  it("excludes legacy null-staff bookings from the WHOLE report when the shop has staff", () => {
    // A staffed shop assigns a concrete person to every new booking, so any
    // null-staff rows are stale pre-staff history. They must drop out of every
    // figure — total bookings, revenue, by-service — not just the staff card.
    const result = computeShopInsights({
      rangeDays: 7,
      windowDates: [day("2026-06-01", 1)],
      hours: makeHours(),
      bookings: [
        makeBooking({ staffId: "s1", serviceId: "svc1", price: 600 }),
        makeBooking({ staffId: null, serviceId: "svc2", price: 100 }),
      ],
      staff: [makeStaff("s1", "ช่างเอ")],
      services: [
        { id: "svc1", name: "ตัดผม" },
        { id: "svc2", name: "สระ" },
      ],
    });
    // Headline totals count only the staffed booking.
    expect(result.totalBookings).toBe(1);
    expect(result.revenue).toBe(600);
    // Per-staff card: only the real staff, no "ไม่ระบุพนักงาน" row.
    expect(result.revenueByStaff.some((r) => r.staffId === null)).toBe(false);
    expect(result.revenueByStaff).toHaveLength(1);
    expect(result.revenueByStaff[0]).toMatchObject({ staffId: "s1", revenue: 600 });
    // By-service: the null-staff booking's service is gone too.
    expect(result.revenueByService.map((r) => r.serviceId)).toEqual(["svc1"]);
  });

  it("emits a single 'คิวรวม (ไม่ระบุพนักงาน)' row when there is no staff", () => {
    const result = computeShopInsights({
      rangeDays: 7,
      windowDates: [day("2026-06-01", 1)],
      hours: makeHours(),
      bookings: [
        makeBooking({ staffId: null, durationMinutes: 60, price: 100 }),
        makeBooking({ staffId: null, durationMinutes: 180, price: 200 }),
      ],
      staff: [],
    });
    expect(result.revenueByStaff).toEqual([
      {
        staffId: null,
        name: "คิวรวม (ไม่ระบุพนักงาน)",
        revenue: 300,
        bookingCount: 2,
      },
    ]);
  });

  it("does NOT count cancelled bookings toward staff revenue or minutes", () => {
    const result = computeShopInsights({
      rangeDays: 7,
      windowDates: [day("2026-06-01", 1)],
      hours: makeHours(),
      bookings: [
        makeBooking({ staffId: "s1", durationMinutes: 200, price: 500, status: "confirmed" }),
        makeBooking({ staffId: "s1", durationMinutes: 999, price: 999, status: "cancelled" }),
      ],
      staff: [makeStaff("s1", "ช่างเอ")],
    });
    expect(result.revenueByStaff[0]).toMatchObject({
      revenue: 500,
      bookingCount: 1,
    });
  });
});

// --- computeShopInsights: revenueByService -----------------------------------

describe("computeShopInsights — revenueByService", () => {
  it("ranks services by revenue desc, resolving names from the services list", () => {
    const result = computeShopInsights({
      rangeDays: 7,
      windowDates: [day("2026-06-01", 1)],
      hours: makeHours(),
      bookings: [
        makeBooking({ serviceId: "svc-a", price: 100 }),
        makeBooking({ serviceId: "svc-a", price: 100 }),
        makeBooking({ serviceId: "svc-b", price: 500 }),
      ],
      staff: [],
      services: [makeService("svc-a", "ตัดผม"), makeService("svc-b", "ทำสี")],
    });
    expect(result.revenueByService).toEqual([
      { serviceId: "svc-b", name: "ทำสี", revenue: 500, bookingCount: 1 },
      { serviceId: "svc-a", name: "ตัดผม", revenue: 200, bookingCount: 2 },
    ]);
  });

  it("buckets null service_id under 'ไม่ระบุบริการ'", () => {
    const result = computeShopInsights({
      rangeDays: 7,
      windowDates: [day("2026-06-01", 1)],
      hours: makeHours(),
      bookings: [makeBooking({ serviceId: null, price: 80 })],
      staff: [],
      services: [],
    });
    expect(result.revenueByService).toEqual([
      { serviceId: null, name: "ไม่ระบุบริการ", revenue: 80, bookingCount: 1 },
    ]);
  });

  it("labels a deleted/unknown service_id as 'บริการอื่นๆ'", () => {
    const result = computeShopInsights({
      rangeDays: 7,
      windowDates: [day("2026-06-01", 1)],
      hours: makeHours(),
      bookings: [makeBooking({ serviceId: "gone", price: 120 })],
      staff: [],
      services: [makeService("svc-a", "ตัดผม")],
    });
    expect(result.revenueByService).toEqual([
      { serviceId: "gone", name: "บริการอื่นๆ", revenue: 120, bookingCount: 1 },
    ]);
  });

  it("counts null-priced bookings in bookingCount but contributes 0 revenue", () => {
    const result = computeShopInsights({
      rangeDays: 7,
      windowDates: [day("2026-06-01", 1)],
      hours: makeHours(),
      bookings: [
        makeBooking({ serviceId: "svc-a", price: null }),
        makeBooking({ serviceId: "svc-a", price: null }),
      ],
      staff: [],
      services: [makeService("svc-a", "ตัดผม")],
    });
    expect(result.revenueByService).toEqual([
      { serviceId: "svc-a", name: "ตัดผม", revenue: 0, bookingCount: 2 },
    ]);
  });

  it("excludes cancelled bookings from service rows", () => {
    const result = computeShopInsights({
      rangeDays: 7,
      windowDates: [day("2026-06-01", 1)],
      hours: makeHours(),
      bookings: [
        makeBooking({ serviceId: "svc-a", price: 100, status: "confirmed" }),
        makeBooking({ serviceId: "svc-a", price: 999, status: "cancelled" }),
      ],
      staff: [],
      services: [makeService("svc-a", "ตัดผม")],
    });
    expect(result.revenueByService).toEqual([
      { serviceId: "svc-a", name: "ตัดผม", revenue: 100, bookingCount: 1 },
    ]);
  });
});

// --- computeShopInsights: filtering ------------------------------------------

describe("computeShopInsights — filtering", () => {
  const base = {
    rangeDays: 7,
    windowDates: [day("2026-06-01", 1)],
    hours: makeHours(),
    staff: [makeStaff("s1", "ช่างเอ"), makeStaff("s2", "ช่างบี")],
    services: [makeService("svc-a", "ตัดผม"), makeService("svc-b", "ทำสี")],
  };

  const bookings = [
    makeBooking({ staffId: "s1", serviceId: "svc-a", price: 100, durationMinutes: 60 }),
    makeBooking({ staffId: "s2", serviceId: "svc-b", price: 500, durationMinutes: 120 }),
    makeBooking({ staffId: "s1", serviceId: "svc-b", price: 300, durationMinutes: 60, status: "cancelled" }),
  ];

  it("hasFilter is false and nothing is excluded when no filter is set", () => {
    const result = computeShopInsights({ ...base, bookings });
    expect(result.hasFilter).toBe(false);
    expect(result.revenue).toBe(600); // 100 + 500
    expect(result.totalBookings).toBe(2);
  });

  it("filterStaffIds narrows every booking-derived metric to that staff", () => {
    const result = computeShopInsights({ ...base, bookings, filterStaffIds: ["s1"] });
    expect(result.hasFilter).toBe(true);
    // Only s1's active booking (svc-a, ฿100) survives; cancelled s1 stays counted
    // toward cancellationRate within the filtered set.
    expect(result.revenue).toBe(100);
    expect(result.totalBookings).toBe(1);
    expect(result.cancellationRate).toBeCloseTo(0.5, 10); // 1 active, 1 cancelled
    // Only the filtered staff row is present.
    expect(result.revenueByStaff).toHaveLength(1);
    expect(result.revenueByStaff[0].staffId).toBe("s1");
    // fillRate still divides by full capacity (share of total capacity).
    expect(result.lineMinutes).toBe(480);
  });

  it("filterServiceIds narrows to that service", () => {
    const result = computeShopInsights({ ...base, bookings, filterServiceIds: ["svc-b"] });
    expect(result.hasFilter).toBe(true);
    expect(result.revenue).toBe(500); // only the active svc-b booking
    expect(result.totalBookings).toBe(1);
    expect(result.revenueByService).toEqual([
      { serviceId: "svc-b", name: "ทำสี", revenue: 500, bookingCount: 1 },
    ]);
  });

  it("multi-select staff includes a booking from ANY selected staff (union)", () => {
    const result = computeShopInsights({ ...base, bookings, filterStaffIds: ["s1", "s2"] });
    // Both s1 (svc-a ฿100) and s2 (svc-b ฿500) active bookings survive.
    expect(result.revenue).toBe(600);
    expect(result.totalBookings).toBe(2);
    expect(result.revenueByStaff.map((r) => r.staffId).sort()).toEqual(["s1", "s2"]);
  });

  it("multi-select service is a union across the selected services", () => {
    const result = computeShopInsights({
      ...base,
      bookings,
      filterServiceIds: ["svc-a", "svc-b"],
    });
    expect(result.revenue).toBe(600); // svc-a ฿100 + svc-b ฿500
    expect(result.totalBookings).toBe(2);
  });

  it("combined staff + service filters apply both", () => {
    const result = computeShopInsights({
      ...base,
      bookings,
      filterStaffIds: ["s2"],
      filterServiceIds: ["svc-b"],
    });
    expect(result.revenue).toBe(500);
    expect(result.totalBookings).toBe(1);
  });

  it("filteredToZero is false when the filter leaves only a cancelled row", () => {
    const result = computeShopInsights({
      ...base,
      bookings,
      filterStaffIds: ["s1"],
      filterServiceIds: ["svc-b"], // s1 only has a cancelled svc-b booking + active svc-a
    });
    // s1 + svc-b matches only the cancelled booking → no active, but the row set
    // is non-empty (1 cancelled), so this is NOT filteredToZero; data remains.
    expect(result.filteredToZero).toBe(false);
    expect(result.hasData).toBe(true);
  });

  it("filteredToZero is true when no booking matches the filter at all", () => {
    const result = computeShopInsights({
      ...base,
      bookings,
      filterStaffIds: ["ghost"], // no booking has this staff
    });
    expect(result.filteredToZero).toBe(true);
    expect(result.hasData).toBe(false);
  });

  it("filteredToZero is false when there were no bookings to begin with", () => {
    const result = computeShopInsights({
      ...base,
      bookings: [],
      filterStaffIds: ["s1"],
    });
    expect(result.filteredToZero).toBe(false);
    expect(result.hasFilter).toBe(true);
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
      avgTicket: 0,
      lineMinutes: 0,
      capacity: 1,
      busyByHour: [],
      peakHour: null,
      revenueByStaff: [
        {
          staffId: null,
          name: "คิวรวม (ไม่ระบุพนักงาน)",
          revenue: 0,
          bookingCount: 0,
        },
      ],
      revenueByService: [],
      expensesTotal: 0,
      netProfit: 0,
      profitMargin: null,
      expensesByCategory: [],
      hasData: false,
      hasFilter: false,
      filteredToZero: false,
    });
  });
});
