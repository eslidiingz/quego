import { describe, it, expect } from "vitest";
import {
  hhmmToMinutes,
  minutesToHHMM,
  generateSlots,
  intervalsOverlap,
  busyLineCount,
  evaluateSlots,
  eachDateInWindow,
  findSoonestSlot,
  nextYmd,
  countOpenSlotsToday,
  DAYS_OF_WEEK,
  type BookedInterval,
  type BusinessHour,
  type BookingContext,
} from "./slot-math";

describe("hhmmToMinutes", () => {
  it("parses midnight to 0", () => {
    expect(hhmmToMinutes("00:00")).toBe(0);
  });

  it("parses a zero-padded morning time", () => {
    expect(hhmmToMinutes("09:05")).toBe(545);
  });

  it("parses a top-of-the-hour time", () => {
    expect(hhmmToMinutes("09:00")).toBe(540);
  });

  it("parses an evening time past noon", () => {
    expect(hhmmToMinutes("18:30")).toBe(1110);
  });

  it("parses the last minute of the day", () => {
    expect(hhmmToMinutes("23:59")).toBe(1439);
  });
});

describe("minutesToHHMM", () => {
  it("formats 0 as midnight", () => {
    expect(minutesToHHMM(0)).toBe("00:00");
  });

  it("zero-pads single-digit hours and minutes", () => {
    expect(minutesToHHMM(545)).toBe("09:05");
  });

  it("formats a top-of-the-hour time", () => {
    expect(minutesToHHMM(540)).toBe("09:00");
  });

  it("formats an evening time", () => {
    expect(minutesToHHMM(1110)).toBe("18:30");
  });

  it("formats the last minute of the day", () => {
    expect(minutesToHHMM(1439)).toBe("23:59");
  });
});

describe("hhmmToMinutes <-> minutesToHHMM round-trip", () => {
  it("round-trips midnight", () => {
    expect(minutesToHHMM(hhmmToMinutes("00:00"))).toBe("00:00");
  });

  it("round-trips a padded time", () => {
    expect(minutesToHHMM(hhmmToMinutes("09:05"))).toBe("09:05");
  });

  it("round-trips a minutes value through both directions", () => {
    expect(hhmmToMinutes(minutesToHHMM(545))).toBe(545);
  });

  it("round-trips every minute of a full day", () => {
    for (let total = 0; total < 24 * 60; total += 1) {
      expect(hhmmToMinutes(minutesToHHMM(total))).toBe(total);
    }
  });
});

describe("generateSlots", () => {
  it("spaces slots by the duration and drops the trailing remainder", () => {
    expect(generateSlots("09:00", "10:00", 30)).toEqual(["09:00", "09:30"]);
  });

  it("drops a slot that would not fit before close", () => {
    // 09:45 + 45 = 10:30 > 10:00, so only the first slot fits.
    expect(generateSlots("09:00", "10:00", 45)).toEqual(["09:00"]);
  });

  it("allows a final slot that ends exactly at close (exact-fit boundary)", () => {
    // 09:30 + 30 = 10:00 == close, so 09:30 is allowed.
    expect(generateSlots("09:00", "10:00", 30)).toContain("09:30");
  });

  it("includes the single slot when duration exactly fills the window", () => {
    expect(generateSlots("09:00", "10:00", 60)).toEqual(["09:00"]);
  });

  it("generates a longer grid across multiple hours", () => {
    expect(generateSlots("09:00", "12:00", 60)).toEqual([
      "09:00",
      "10:00",
      "11:00",
    ]);
  });

  it("returns [] when open equals close", () => {
    expect(generateSlots("09:00", "09:00", 30)).toEqual([]);
  });

  it("returns [] when open is after close", () => {
    expect(generateSlots("10:00", "09:00", 30)).toEqual([]);
  });

  it("returns [] when duration is zero", () => {
    expect(generateSlots("09:00", "10:00", 0)).toEqual([]);
  });

  it("returns [] when duration is negative", () => {
    expect(generateSlots("09:00", "10:00", -30)).toEqual([]);
  });

  it("returns [] when the window is shorter than one duration", () => {
    // 09:00 + 30 = 09:30 > 09:15, nothing fits.
    expect(generateSlots("09:00", "09:15", 30)).toEqual([]);
  });

  it("handles non-aligned durations leaving an unusable remainder", () => {
    // 09:00, 09:25; 09:50 would end at 10:15 > 10:00, so it stops at 09:25.
    expect(generateSlots("09:00", "10:00", 25)).toEqual(["09:00", "09:25"]);
  });
});

describe("intervalsOverlap", () => {
  it("returns false for touching intervals (half-open boundary)", () => {
    // [0,30) vs [30,60): a's end touches b's start, no overlap.
    expect(intervalsOverlap(0, 30, 30, 30)).toBe(false);
  });

  it("returns false for touching intervals in the reverse order", () => {
    // [30,60) vs [0,30): symmetric, still no overlap.
    expect(intervalsOverlap(30, 30, 0, 30)).toBe(false);
  });

  it("returns true for partially overlapping intervals", () => {
    // [0,30) vs [15,45): overlap on [15,30).
    expect(intervalsOverlap(0, 30, 15, 30)).toBe(true);
  });

  it("returns true when one interval is fully contained in the other", () => {
    // [0,60) contains [15,30).
    expect(intervalsOverlap(0, 60, 15, 15)).toBe(true);
  });

  it("returns true when the containment is reversed", () => {
    // [15,30) inside [0,60).
    expect(intervalsOverlap(15, 15, 0, 60)).toBe(true);
  });

  it("returns true for identical intervals", () => {
    expect(intervalsOverlap(60, 30, 60, 30)).toBe(true);
  });

  it("returns false for fully disjoint intervals", () => {
    // [0,30) vs [60,90): a gap between them.
    expect(intervalsOverlap(0, 30, 60, 30)).toBe(false);
  });

  it("returns true when intervals overlap by a single minute", () => {
    // [0,30) vs [29,59): overlap on [29,30).
    expect(intervalsOverlap(0, 30, 29, 30)).toBe(true);
  });
});

describe("busyLineCount", () => {
  const date = "2026-06-07";

  const iv = (
    overrides: Partial<BookedInterval> & Pick<BookedInterval, "startMin">,
  ): BookedInterval => ({
    date,
    durationMin: 30,
    staffId: null,
    ...overrides,
  });

  it("ignores intervals on a different date", () => {
    const intervals: BookedInterval[] = [
      iv({ date: "2026-06-08", startMin: 540, staffId: null }),
    ];
    expect(busyLineCount(intervals, date, 540, 30)).toBe(0);
  });

  it("ignores intervals that do not overlap the candidate", () => {
    const intervals: BookedInterval[] = [
      iv({ startMin: 600, staffId: null }), // [600,630)
    ];
    // candidate [540,570) does not touch [600,630).
    expect(busyLineCount(intervals, date, 540, 30)).toBe(0);
  });

  it("does not count a touching interval (half-open)", () => {
    const intervals: BookedInterval[] = [
      iv({ startMin: 570, staffId: null }), // [570,600)
    ];
    // candidate [540,570) touches but does not overlap.
    expect(busyLineCount(intervals, date, 540, 30)).toBe(0);
  });

  it("counts each null-staff overlapping interval as one line when no filter", () => {
    const intervals: BookedInterval[] = [
      iv({ startMin: 540, staffId: null }),
      iv({ startMin: 550, staffId: null }),
    ];
    expect(busyLineCount(intervals, date, 540, 30)).toBe(2);
  });

  it("counts the same staffId only once even across multiple overlapping bookings", () => {
    const intervals: BookedInterval[] = [
      iv({ startMin: 540, staffId: "s1" }),
      iv({ startMin: 545, staffId: "s1" }),
    ];
    expect(busyLineCount(intervals, date, 540, 30)).toBe(1);
  });

  it("counts distinct overlapping staff lines separately", () => {
    const intervals: BookedInterval[] = [
      iv({ startMin: 540, staffId: "s1" }),
      iv({ startMin: 540, staffId: "s2" }),
    ];
    expect(busyLineCount(intervals, date, 540, 30)).toBe(2);
  });

  it("combines null-staff lines and distinct staff lines when no filter", () => {
    const intervals: BookedInterval[] = [
      iv({ startMin: 540, staffId: null }),
      iv({ startMin: 540, staffId: "s1" }),
      iv({ startMin: 540, staffId: "s2" }),
    ];
    expect(busyLineCount(intervals, date, 540, 30)).toBe(3);
  });

  it("counts only staffIds in the filter set when a filter is active", () => {
    const intervals: BookedInterval[] = [
      iv({ startMin: 540, staffId: "s1" }),
      iv({ startMin: 540, staffId: "s2" }),
      iv({ startMin: 540, staffId: "s3" }),
    ];
    const filter = new Set(["s1", "s2"]);
    expect(busyLineCount(intervals, date, 540, 30, filter)).toBe(2);
  });

  it("excludes null-staff intervals when a filter is active", () => {
    const intervals: BookedInterval[] = [
      iv({ startMin: 540, staffId: null }),
      iv({ startMin: 540, staffId: "s1" }),
    ];
    const filter = new Set(["s1"]);
    // null-staff line is dropped; only s1 counts.
    expect(busyLineCount(intervals, date, 540, 30, filter)).toBe(1);
  });

  it("returns 0 with a filter when only null-staff intervals overlap", () => {
    const intervals: BookedInterval[] = [
      iv({ startMin: 540, staffId: null }),
      iv({ startMin: 545, staffId: null }),
    ];
    const filter = new Set(["s1"]);
    expect(busyLineCount(intervals, date, 540, 30, filter)).toBe(0);
  });

  it("dedups the same staffId across overlapping bookings even with a filter", () => {
    const intervals: BookedInterval[] = [
      iv({ startMin: 540, staffId: "s1" }),
      iv({ startMin: 545, staffId: "s1" }),
    ];
    const filter = new Set(["s1"]);
    expect(busyLineCount(intervals, date, 540, 30, filter)).toBe(1);
  });

  it("treats a null filter the same as no filter (counts null-staff lines)", () => {
    const intervals: BookedInterval[] = [
      iv({ startMin: 540, staffId: null }),
    ];
    expect(busyLineCount(intervals, date, 540, 30, null)).toBe(1);
  });

  it("returns 0 for an empty interval list", () => {
    expect(busyLineCount([], date, 540, 30)).toBe(0);
  });
});

describe("evaluateSlots", () => {
  const date = "2026-06-07";

  const iv = (
    overrides: Partial<BookedInterval> & Pick<BookedInterval, "startMin">,
  ): BookedInterval => ({
    date,
    durationMin: 30,
    staffId: null,
    ...overrides,
  });

  it("returns one entry per generated slot in order", () => {
    const result = evaluateSlots({
      openTime: "09:00",
      closeTime: "10:00",
      durationMinutes: 30,
      date,
      intervals: [],
      capacity: 1,
      isToday: false,
      nowHHMM: "00:00",
    });
    expect(result.map((s) => s.time)).toEqual(["09:00", "09:30"]);
  });

  it("marks every slot available when nothing is booked and not today", () => {
    const result = evaluateSlots({
      openTime: "09:00",
      closeTime: "10:00",
      durationMinutes: 30,
      date,
      intervals: [],
      capacity: 1,
      isToday: false,
      nowHHMM: "23:59",
    });
    expect(result).toEqual([
      { time: "09:00", isFull: false, isPast: false, isAvailable: true },
      { time: "09:30", isFull: false, isPast: false, isAvailable: true },
    ]);
  });

  it("marks a slot full when busyLineCount reaches capacity", () => {
    const result = evaluateSlots({
      openTime: "09:00",
      closeTime: "10:00",
      durationMinutes: 30,
      date,
      intervals: [iv({ startMin: 540, staffId: null })], // fills [540,570)
      capacity: 1,
      isToday: false,
      nowHHMM: "00:00",
    });
    const nine = result.find((s) => s.time === "09:00")!;
    expect(nine.isFull).toBe(true);
    expect(nine.isAvailable).toBe(false);
    // 09:30 has no overlapping booking, stays open.
    const nineThirty = result.find((s) => s.time === "09:30")!;
    expect(nineThirty.isFull).toBe(false);
    expect(nineThirty.isAvailable).toBe(true);
  });

  it("does not mark full when busy lines are below capacity", () => {
    const result = evaluateSlots({
      openTime: "09:00",
      closeTime: "10:00",
      durationMinutes: 30,
      date,
      intervals: [iv({ startMin: 540, staffId: null })], // 1 line busy
      capacity: 2,
      isToday: false,
      nowHHMM: "00:00",
    });
    const nine = result.find((s) => s.time === "09:00")!;
    expect(nine.isFull).toBe(false);
    expect(nine.isAvailable).toBe(true);
  });

  it("marks slots at or before now as past when isToday is true", () => {
    const result = evaluateSlots({
      openTime: "09:00",
      closeTime: "11:00",
      durationMinutes: 30,
      date,
      intervals: [],
      capacity: 1,
      isToday: true,
      nowHHMM: "09:30",
    });
    const byTime = Object.fromEntries(result.map((s) => [s.time, s]));
    // 09:00 < now -> past
    expect(byTime["09:00"].isPast).toBe(true);
    // 09:30 == now -> past (equal counts as past)
    expect(byTime["09:30"].isPast).toBe(true);
    // 10:00 > now -> not past
    expect(byTime["10:00"].isPast).toBe(false);
    expect(byTime["10:30"].isPast).toBe(false);
  });

  it("treats a slot exactly equal to now as past", () => {
    const result = evaluateSlots({
      openTime: "09:00",
      closeTime: "10:00",
      durationMinutes: 30,
      date,
      intervals: [],
      capacity: 1,
      isToday: true,
      nowHHMM: "09:00",
    });
    expect(result.find((s) => s.time === "09:00")!.isPast).toBe(true);
  });

  it("never marks anything past when isToday is false", () => {
    const result = evaluateSlots({
      openTime: "09:00",
      closeTime: "11:00",
      durationMinutes: 30,
      date,
      intervals: [],
      capacity: 1,
      isToday: false,
      nowHHMM: "23:59",
    });
    expect(result.every((s) => s.isPast === false)).toBe(true);
    expect(result.every((s) => s.isAvailable === true)).toBe(true);
  });

  it("computes isAvailable as !isFull && !isPast (full but not past)", () => {
    const result = evaluateSlots({
      openTime: "09:00",
      closeTime: "10:00",
      durationMinutes: 30,
      date,
      intervals: [iv({ startMin: 540, staffId: null })],
      capacity: 1,
      isToday: false,
      nowHHMM: "00:00",
    });
    const nine = result.find((s) => s.time === "09:00")!;
    expect(nine).toMatchObject({ isFull: true, isPast: false, isAvailable: false });
  });

  it("computes isAvailable false when a slot is both full and past", () => {
    const result = evaluateSlots({
      openTime: "09:00",
      closeTime: "10:00",
      durationMinutes: 30,
      date,
      intervals: [iv({ startMin: 540, staffId: null })],
      capacity: 1,
      isToday: true,
      nowHHMM: "12:00", // 09:00 is in the past
    });
    const nine = result.find((s) => s.time === "09:00")!;
    expect(nine).toMatchObject({ isFull: true, isPast: true, isAvailable: false });
  });

  it("threads staffIdFilter through to the fullness check", () => {
    const intervals: BookedInterval[] = [
      iv({ startMin: 540, staffId: "s1" }),
      iv({ startMin: 540, staffId: "s2" }),
    ];
    // Without a filter both staff lines count -> 2 >= capacity 2 -> full.
    const unfiltered = evaluateSlots({
      openTime: "09:00",
      closeTime: "09:30",
      durationMinutes: 30,
      date,
      intervals,
      capacity: 2,
      isToday: false,
      nowHHMM: "00:00",
    });
    expect(unfiltered.find((s) => s.time === "09:00")!.isFull).toBe(true);

    // With a filter that only allows s1, just 1 line counts -> not full.
    const filtered = evaluateSlots({
      openTime: "09:00",
      closeTime: "09:30",
      durationMinutes: 30,
      date,
      intervals,
      capacity: 2,
      isToday: false,
      nowHHMM: "00:00",
      staffIdFilter: new Set(["s1"]),
    });
    expect(filtered.find((s) => s.time === "09:00")!.isFull).toBe(false);
    expect(filtered.find((s) => s.time === "09:00")!.isAvailable).toBe(true);
  });

  it("uses the slot's own duration window for overlap, not a fixed grid", () => {
    // 60-minute service. A booking at 09:30 overlaps the 09:00 candidate
    // ([540,600) vs [570,...)) because the candidate spans a full hour.
    const result = evaluateSlots({
      openTime: "09:00",
      closeTime: "11:00",
      durationMinutes: 60,
      date,
      intervals: [iv({ startMin: 570, durationMin: 30, staffId: null })],
      capacity: 1,
      isToday: false,
      nowHHMM: "00:00",
    });
    // candidate 09:00 = [540,600) overlaps booking [570,600) -> full
    expect(result.find((s) => s.time === "09:00")!.isFull).toBe(true);
    // candidate 10:00 = [600,660) does not overlap [570,600) -> open
    expect(result.find((s) => s.time === "10:00")!.isFull).toBe(false);
  });

  it("returns an empty array when no slots are generated", () => {
    const result = evaluateSlots({
      openTime: "10:00",
      closeTime: "09:00",
      durationMinutes: 30,
      date,
      intervals: [],
      capacity: 1,
      isToday: false,
      nowHHMM: "00:00",
    });
    expect(result).toEqual([]);
  });
});

describe("nextYmd", () => {
  it("advances within a month", () => {
    expect(nextYmd("2026-06-10")).toBe("2026-06-11");
  });

  it("rolls over a month boundary", () => {
    expect(nextYmd("2026-06-30")).toBe("2026-07-01");
  });

  it("rolls over a year boundary", () => {
    expect(nextYmd("2026-12-31")).toBe("2027-01-01");
  });
});

describe("eachDateInWindow", () => {
  it("includes both inclusive endpoints", () => {
    const days = eachDateInWindow("2026-06-10", "2026-06-12");
    expect(days.map((d) => d.dateYmd)).toEqual([
      "2026-06-10",
      "2026-06-11",
      "2026-06-12",
    ]);
  });

  it("returns a single day when start equals end", () => {
    const days = eachDateInWindow("2026-06-10", "2026-06-10");
    expect(days.map((d) => d.dateYmd)).toEqual(["2026-06-10"]);
  });

  it("increments the day-of-week across the window (0..6)", () => {
    const days = eachDateInWindow("2026-06-10", "2026-06-11");
    expect(days[0].dayOfWeek).toBeGreaterThanOrEqual(0);
    expect(days[0].dayOfWeek).toBeLessThanOrEqual(6);
    expect(days[1].dayOfWeek).toBe(((days[0].dayOfWeek + 1) % 7) as 0 | 1 | 2 | 3 | 4 | 5 | 6);
  });
});

describe("findSoonestSlot", () => {
  const openHours = (): BusinessHour[] =>
    Array.from({ length: 7 }, (_, dow) => ({
      dayOfWeek: dow as BusinessHour["dayOfWeek"],
      isOpen: true,
      openTime: "09:00",
      closeTime: "12:00", // slots at 30m: 09:00 09:30 10:00 10:30 11:00 11:30
    }));
  const window = eachDateInWindow("2026-06-10", "2026-06-12");
  const base = {
    days: window,
    durationMinutes: 30,
    intervals: [] as BookedInterval[],
    capacity: 1,
    nowDate: "2026-06-09", // before the window → nothing is "today" or past
    nowHHMM: "00:00",
  };

  it("returns the first open slot when nothing is booked", () => {
    expect(findSoonestSlot({ ...base, hours: openHours() })).toEqual({
      date: "2026-06-10",
      time: "09:00",
    });
  });

  it("skips a fully-booked first day to the next open day", () => {
    const intervals: BookedInterval[] = [540, 570, 600, 630, 660, 690].map(
      (startMin) => ({ date: "2026-06-10", startMin, durationMin: 30, staffId: null }),
    );
    expect(findSoonestSlot({ ...base, hours: openHours(), intervals })).toEqual({
      date: "2026-06-11",
      time: "09:00",
    });
  });

  it("treats parallel capacity as more availability — any-staff opens up sooner", () => {
    const intervals: BookedInterval[] = [
      { date: "2026-06-10", startMin: 540, durationMin: 30, staffId: "s1" },
    ];
    // Pinned to the booked staff (capacity 1) → 09:00 taken, soonest 09:30.
    expect(
      findSoonestSlot({
        ...base,
        hours: openHours(),
        intervals,
        capacity: 1,
        staffIdFilter: new Set(["s1"]),
      }),
    ).toEqual({ date: "2026-06-10", time: "09:30" });
    // "ใครก็ได้": two parallel lines → 09:00 still has a free line.
    expect(
      findSoonestSlot({
        ...base,
        hours: openHours(),
        intervals,
        capacity: 2,
        staffIdFilter: new Set(["s1", "s2"]),
      }),
    ).toEqual({ date: "2026-06-10", time: "09:00" });
  });

  it("excludes past slots on today", () => {
    expect(
      findSoonestSlot({ ...base, hours: openHours(), nowDate: "2026-06-10", nowHHMM: "09:15" }),
    ).toEqual({ date: "2026-06-10", time: "09:30" });
  });

  it("excludes slots listed in takenKeys", () => {
    expect(
      findSoonestSlot({
        ...base,
        hours: openHours(),
        takenKeys: new Set(["2026-06-10 09:00"]),
      }),
    ).toEqual({ date: "2026-06-10", time: "09:30" });
  });

  it("returns null when every day is closed", () => {
    const closed = openHours().map((h) => ({
      ...h,
      isOpen: false,
      openTime: null,
      closeTime: null,
    }));
    expect(findSoonestSlot({ ...base, hours: closed })).toBeNull();
  });

  it("returns null when the window is empty", () => {
    expect(findSoonestSlot({ ...base, hours: openHours(), days: [] })).toBeNull();
  });
});

describe("countOpenSlotsToday", () => {
  // Every weekday open 10:00–12:00 so the result is independent of which day
  // "2026-06-14" falls on; at 30-min duration that grid is
  // 10:00 / 10:30 / 11:00 / 11:30 = 4 candidate slots.
  function ctx(overrides: Partial<BookingContext> = {}): BookingContext {
    return {
      shop: { id: "s1", name: "ร้านทดสอบ", serviceDurationMinutes: 30 },
      services: [],
      capacity: 1,
      bookedIntervals: [],
      hours: DAYS_OF_WEEK.map((dayOfWeek) => ({
        dayOfWeek,
        isOpen: true,
        openTime: "10:00",
        closeTime: "12:00",
      })),
      windowStart: "2026-06-14",
      windowEnd: "2026-06-21",
      nowDate: "2026-06-14",
      nowTimeHHMM: "00:00",
      staff: [],
      ...overrides,
    };
  }

  it("counts every fitting slot when the day is empty and nothing is past", () => {
    expect(countOpenSlotsToday(ctx())).toBe(4);
  });

  it("excludes slots at or before now", () => {
    // now = 11:00 → 10:00 / 10:30 / 11:00 are past, only 11:30 remains.
    expect(countOpenSlotsToday(ctx({ nowTimeHHMM: "11:00" }))).toBe(1);
  });

  it("excludes a slot whose only line is fully booked", () => {
    const booked: BookedInterval[] = [
      { date: "2026-06-14", startMin: 600 /* 10:00 */, durationMin: 30, staffId: null },
    ];
    expect(countOpenSlotsToday(ctx({ bookedIntervals: booked }))).toBe(3);
  });

  it("returns 0 when the shop is closed today", () => {
    const closed = DAYS_OF_WEEK.map((dayOfWeek) => ({
      dayOfWeek,
      isOpen: false,
      openTime: null,
      closeTime: null,
    }));
    expect(countOpenSlotsToday(ctx({ hours: closed }))).toBe(0);
  });

  it("keeps a slot open while capacity exceeds the booked lines", () => {
    // capacity 2, one line booked at 10:00 → still one free line there.
    const booked: BookedInterval[] = [
      { date: "2026-06-14", startMin: 600, durationMin: 30, staffId: "a" },
    ];
    expect(countOpenSlotsToday(ctx({ capacity: 2, bookedIntervals: booked }))).toBe(4);
  });
});
