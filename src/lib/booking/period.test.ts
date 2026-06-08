import { describe, it, expect } from "vitest";
import {
  parseBookingPeriod,
  bookingPeriodWindow,
  isBookingInPeriod,
} from "./period";

// All cases pass an explicit Bangkok "today" so results never depend on the
// host clock. Reference: 2026-06-10 is a Wednesday; 2026-06-08 is a Monday;
// 2026-01-01 is a Thursday (cross-year week). Weeks are Monday-start.

describe("parseBookingPeriod", () => {
  it("accepts the four known periods", () => {
    expect(parseBookingPeriod("today")).toBe("today");
    expect(parseBookingPeriod("week")).toBe("week");
    expect(parseBookingPeriod("month")).toBe("month");
    expect(parseBookingPeriod("all")).toBe("all");
  });

  it("falls back to 'today' for unknown or missing input", () => {
    expect(parseBookingPeriod(undefined)).toBe("today");
    expect(parseBookingPeriod("")).toBe("today");
    expect(parseBookingPeriod("yesterday")).toBe("today");
    expect(parseBookingPeriod("WEEK")).toBe("today");
  });
});

describe("bookingPeriodWindow", () => {
  it("today is a single-day inclusive window", () => {
    expect(bookingPeriodWindow("today", "2026-06-10")).toEqual({
      start: "2026-06-10",
      end: "2026-06-10",
    });
  });

  it("week spans Monday → Sunday around a mid-week day", () => {
    // Wednesday 2026-06-10 → Mon 06-08 .. Sun 06-14
    expect(bookingPeriodWindow("week", "2026-06-10")).toEqual({
      start: "2026-06-08",
      end: "2026-06-14",
    });
  });

  it("week starting exactly on Monday stays put", () => {
    expect(bookingPeriodWindow("week", "2026-06-08")).toEqual({
      start: "2026-06-08",
      end: "2026-06-14",
    });
  });

  it("week crosses a year boundary correctly", () => {
    // Thursday 2026-01-01 → Mon 2025-12-29 .. Sun 2026-01-04
    expect(bookingPeriodWindow("week", "2026-01-01")).toEqual({
      start: "2025-12-29",
      end: "2026-01-04",
    });
  });

  it("month covers the whole calendar month", () => {
    expect(bookingPeriodWindow("month", "2026-06-10")).toEqual({
      start: "2026-06-01",
      end: "2026-06-30",
    });
  });

  it("month handles non-leap February (28 days)", () => {
    expect(bookingPeriodWindow("month", "2026-02-15")).toEqual({
      start: "2026-02-01",
      end: "2026-02-28",
    });
  });

  it("month handles leap February (29 days)", () => {
    expect(bookingPeriodWindow("month", "2024-02-15")).toEqual({
      start: "2024-02-01",
      end: "2024-02-29",
    });
  });

  it("all is unbounded (null)", () => {
    expect(bookingPeriodWindow("all", "2026-06-10")).toBeNull();
  });
});

describe("isBookingInPeriod", () => {
  const today = "2026-06-10"; // Wednesday

  it("today matches only the exact date", () => {
    expect(isBookingInPeriod("2026-06-10", "today", today)).toBe(true);
    expect(isBookingInPeriod("2026-06-09", "today", today)).toBe(false);
    expect(isBookingInPeriod("2026-06-11", "today", today)).toBe(false);
  });

  it("week includes both past and upcoming days in the same week", () => {
    expect(isBookingInPeriod("2026-06-08", "week", today)).toBe(true); // Mon
    expect(isBookingInPeriod("2026-06-14", "week", today)).toBe(true); // Sun
    expect(isBookingInPeriod("2026-06-07", "week", today)).toBe(false); // prev Sun
    expect(isBookingInPeriod("2026-06-15", "week", today)).toBe(false); // next Mon
  });

  it("month bounds at the calendar edges", () => {
    expect(isBookingInPeriod("2026-06-01", "month", today)).toBe(true);
    expect(isBookingInPeriod("2026-06-30", "month", today)).toBe(true);
    expect(isBookingInPeriod("2026-05-31", "month", today)).toBe(false);
    expect(isBookingInPeriod("2026-07-01", "month", today)).toBe(false);
  });

  it("all matches every date", () => {
    expect(isBookingInPeriod("2020-01-01", "all", today)).toBe(true);
    expect(isBookingInPeriod("2099-12-31", "all", today)).toBe(true);
  });
});
