import { describe, it, expect } from "vitest";
import {
  getBangkokNow,
  getBangkokToday,
  dayOfWeekFor,
  getBangkokDateWindow,
  getBangkokRecentDates,
  getBangkokMonthToDate,
  getBangkokLastMonth,
} from "./bangkok";

// Bangkok runs on ICT = UTC+7, no DST. Every assertion below feeds an explicit
// UTC instant (".....Z") so the result is deterministic regardless of the host
// clock or host timezone. Expected values were computed by hand and
// cross-checked against Intl in Asia/Bangkok.

describe("getBangkokNow", () => {
  it("applies the +7 offset to an afternoon-UTC instant (same Bangkok day)", () => {
    // 03:15 UTC + 7h = 10:15 ICT, still Sunday 2026-06-07.
    const result = getBangkokNow(new Date("2026-06-07T03:15:00Z"));
    expect(result).toEqual({ dayOfWeek: 0, timeHHMM: "10:15" });
  });

  it("rolls over into the NEXT Bangkok day for a late-UTC instant (weekday changes)", () => {
    // 18:30 UTC + 7h = 01:30 ICT on the following calendar day.
    // 2026-06-07 is Sunday in UTC; in Bangkok this instant is Monday 2026-06-08.
    const result = getBangkokNow(new Date("2026-06-07T18:30:00Z"));
    expect(result).toEqual({ dayOfWeek: 1, timeHHMM: "01:30" });
  });

  it("normalizes Bangkok midnight to hour \"00\", never \"24\"", () => {
    // 17:00 UTC + 7h = 00:00 ICT (start of Monday 2026-06-08).
    const result = getBangkokNow(new Date("2026-06-07T17:00:00Z"));
    expect(result.timeHHMM).toBe("00:00");
    expect(result.timeHHMM.startsWith("24")).toBe(false);
    expect(result.dayOfWeek).toBe(1);
  });

  it("keeps the late-evening Bangkok time on the same day before midnight", () => {
    // 16:45 UTC + 7h = 23:45 ICT, still Sunday 2026-06-07.
    const result = getBangkokNow(new Date("2026-06-07T16:45:00Z"));
    expect(result).toEqual({ dayOfWeek: 0, timeHHMM: "23:45" });
  });

  it("zero-pads single-digit hours and minutes to HH:MM", () => {
    // 02:05 UTC + 7h = 09:05 ICT.
    const result = getBangkokNow(new Date("2026-06-07T02:05:00Z"));
    expect(result.timeHHMM).toBe("09:05");
  });

  it("maps each UTC weekday-anchor to the expected Bangkok dayOfWeek", () => {
    // Mid-morning UTC instants stay on the same calendar day in Bangkok.
    // 2024-01-01 was a Monday; walk a full week.
    expect(getBangkokNow(new Date("2024-01-01T03:00:00Z")).dayOfWeek).toBe(1);
    expect(getBangkokNow(new Date("2024-01-02T03:00:00Z")).dayOfWeek).toBe(2);
    expect(getBangkokNow(new Date("2024-01-03T03:00:00Z")).dayOfWeek).toBe(3);
    expect(getBangkokNow(new Date("2024-01-04T03:00:00Z")).dayOfWeek).toBe(4);
    expect(getBangkokNow(new Date("2024-01-05T03:00:00Z")).dayOfWeek).toBe(5);
    expect(getBangkokNow(new Date("2024-01-06T03:00:00Z")).dayOfWeek).toBe(6);
    expect(getBangkokNow(new Date("2024-01-07T03:00:00Z")).dayOfWeek).toBe(0);
  });
});

describe("getBangkokToday", () => {
  it("returns the Bangkok calendar date for a morning-UTC instant", () => {
    // 03:00 UTC + 7h = 10:00 ICT, still 2026-06-07 in Bangkok.
    expect(getBangkokToday(new Date("2026-06-07T03:00:00Z"))).toBe("2026-06-07");
  });

  it("rolls forward when UTC is still the previous Bangkok day's evening", () => {
    // 18:00 UTC on 2026-06-07 is 01:00 ICT on 2026-06-08 — June 7 in UTC but
    // June 8 in Bangkok.
    expect(getBangkokToday(new Date("2026-06-07T18:00:00Z"))).toBe("2026-06-08");
  });

  it("does not roll over for a late-but-pre-17:00-UTC instant", () => {
    // 16:59 UTC + 7h = 23:59 ICT, still 2026-06-07.
    expect(getBangkokToday(new Date("2026-06-07T16:59:00Z"))).toBe("2026-06-07");
  });

  it("crosses the month boundary at the Bangkok-day rollover", () => {
    // 17:30 UTC on 2026-05-31 = 00:30 ICT on 2026-06-01.
    expect(getBangkokToday(new Date("2026-05-31T17:30:00Z"))).toBe("2026-06-01");
  });

  it("crosses the year boundary at the Bangkok-day rollover", () => {
    // 18:00 UTC on 2025-12-31 = 01:00 ICT on 2026-01-01.
    expect(getBangkokToday(new Date("2025-12-31T18:00:00Z"))).toBe("2026-01-01");
  });

  it("emits a zero-padded YYYY-MM-DD shape", () => {
    // 02:00 UTC + 7h = 09:00 ICT on 2026-01-05 (single-digit month and day).
    expect(getBangkokToday(new Date("2026-01-05T02:00:00Z"))).toBe("2026-01-05");
  });
});

describe("dayOfWeekFor", () => {
  it("returns Monday=1 for the known anchor 2024-01-01", () => {
    expect(dayOfWeekFor("2024-01-01")).toBe(1);
  });

  it("maps anchor dates across the full week (0=Sun..6=Sat)", () => {
    // 2024-01-01 is Monday; the consecutive days complete the week.
    expect(dayOfWeekFor("2024-01-07")).toBe(0); // Sunday
    expect(dayOfWeekFor("2024-01-01")).toBe(1); // Monday
    expect(dayOfWeekFor("2024-01-02")).toBe(2); // Tuesday
    expect(dayOfWeekFor("2024-01-03")).toBe(3); // Wednesday
    expect(dayOfWeekFor("2024-01-04")).toBe(4); // Thursday
    expect(dayOfWeekFor("2024-01-05")).toBe(5); // Friday
    expect(dayOfWeekFor("2024-01-06")).toBe(6); // Saturday
  });

  it("handles month and year boundaries", () => {
    expect(dayOfWeekFor("2026-01-31")).toBe(6); // Saturday
    expect(dayOfWeekFor("2026-02-01")).toBe(0); // Sunday
    expect(dayOfWeekFor("2026-02-28")).toBe(6); // Saturday (non-leap)
    expect(dayOfWeekFor("2026-03-01")).toBe(0); // Sunday
  });
});

describe("getBangkokDateWindow", () => {
  it("returns exactly daysAhead entries", () => {
    const window = getBangkokDateWindow(7, new Date("2026-06-07T03:00:00Z"));
    expect(window).toHaveLength(7);
  });

  it("starts at today (Bangkok) and lists consecutive calendar days oldest→newest", () => {
    const window = getBangkokDateWindow(3, new Date("2026-06-07T03:00:00Z"));
    expect(window.map((e) => e.dateYmd)).toEqual([
      "2026-06-07",
      "2026-06-08",
      "2026-06-09",
    ]);
  });

  it("uses the rolled-over Bangkok day as the first entry for a late-UTC instant", () => {
    // 18:00 UTC on 2026-06-07 is already 2026-06-08 in Bangkok.
    const window = getBangkokDateWindow(2, new Date("2026-06-07T18:00:00Z"));
    expect(window[0].dateYmd).toBe("2026-06-08");
    expect(window[1].dateYmd).toBe("2026-06-09");
  });

  it("crosses a month boundary within the window", () => {
    // Bangkok today = 2026-05-29; a 5-day window spills into June.
    const window = getBangkokDateWindow(5, new Date("2026-05-29T05:00:00Z"));
    expect(window.map((e) => e.dateYmd)).toEqual([
      "2026-05-29",
      "2026-05-30",
      "2026-05-31",
      "2026-06-01",
      "2026-06-02",
    ]);
  });

  it("keeps each entry's dayOfWeek consistent with dayOfWeekFor", () => {
    const window = getBangkokDateWindow(10, new Date("2026-05-29T05:00:00Z"));
    for (const entry of window) {
      expect(entry.dayOfWeek).toBe(dayOfWeekFor(entry.dateYmd));
    }
  });
});

describe("getBangkokRecentDates", () => {
  it("returns exactly `days` entries", () => {
    const recent = getBangkokRecentDates(7, new Date("2026-06-07T03:00:00Z"));
    expect(recent).toHaveLength(7);
  });

  it("ends at TODAY and includes it, oldest→newest", () => {
    // Bangkok today = 2026-06-07, so a 3-day window is 06-05 … 06-07.
    const recent = getBangkokRecentDates(3, new Date("2026-06-07T03:00:00Z"));
    expect(recent.map((e) => e.dateYmd)).toEqual([
      "2026-06-05",
      "2026-06-06",
      "2026-06-07",
    ]);
  });

  it("contains today's Bangkok date as the last entry", () => {
    const at = new Date("2026-06-07T03:00:00Z");
    const today = getBangkokToday(at); // "2026-06-07"
    const recent = getBangkokRecentDates(14, at);
    expect(recent[recent.length - 1].dateYmd).toBe(today);
    expect(recent.map((e) => e.dateYmd)).toContain(today);
  });

  it("uses the rolled-over Bangkok today as the last entry for a late-UTC instant", () => {
    // 18:00 UTC on 2026-06-07 is 2026-06-08 in Bangkok, so the last entry is
    // 2026-06-08, never 2026-06-07.
    const recent = getBangkokRecentDates(2, new Date("2026-06-07T18:00:00Z"));
    expect(recent.map((e) => e.dateYmd)).toEqual(["2026-06-07", "2026-06-08"]);
  });

  it("crosses a month boundary backwards", () => {
    // Bangkok today = 2026-06-02; a 5-day window reaches back into May.
    const recent = getBangkokRecentDates(5, new Date("2026-06-02T05:00:00Z"));
    expect(recent.map((e) => e.dateYmd)).toEqual([
      "2026-05-29",
      "2026-05-30",
      "2026-05-31",
      "2026-06-01",
      "2026-06-02",
    ]);
  });

  it("crosses a month boundary backwards from the first of a month", () => {
    // Bangkok today = 2026-03-01; the prior 2 days are the tail of February.
    const recent = getBangkokRecentDates(3, new Date("2026-03-01T05:00:00Z"));
    expect(recent.map((e) => e.dateYmd)).toEqual([
      "2026-02-27",
      "2026-02-28",
      "2026-03-01",
    ]);
  });

  it("keeps each entry's dayOfWeek consistent with dayOfWeekFor", () => {
    const recent = getBangkokRecentDates(10, new Date("2026-06-02T05:00:00Z"));
    for (const entry of recent) {
      expect(entry.dayOfWeek).toBe(dayOfWeekFor(entry.dateYmd));
    }
  });
});

describe("getBangkokMonthToDate", () => {
  it("spans the 1st up to and including today", () => {
    // Bangkok 'today' = 2026-06-15 → window is 06-01 … 06-15 (15 days).
    const window = getBangkokMonthToDate(new Date("2026-06-15T05:00:00Z"));
    expect(window).toHaveLength(15);
    expect(window[0].dateYmd).toBe("2026-06-01");
    expect(window[window.length - 1].dateYmd).toBe("2026-06-15");
  });

  it("returns a single day (the 1st) when today is the 1st", () => {
    const window = getBangkokMonthToDate(new Date("2026-06-01T05:00:00Z"));
    expect(window.map((d) => d.dateYmd)).toEqual(["2026-06-01"]);
  });

  it("includes the rolled-over Bangkok day when a late-UTC instant lands on the 1st", () => {
    // 2026-05-31T18:00Z = 2026-06-01T01:00 ICT → Bangkok day is the 1st → just
    // the 1st (never empty).
    const window = getBangkokMonthToDate(new Date("2026-05-31T18:00:00Z"));
    expect(window.map((d) => d.dateYmd)).toEqual(["2026-06-01"]);
  });

  it("derives each entry's dayOfWeek consistently with dayOfWeekFor", () => {
    const window = getBangkokMonthToDate(new Date("2026-06-15T05:00:00Z"));
    for (const entry of window) {
      expect(entry.dayOfWeek).toBe(dayOfWeekFor(entry.dateYmd));
    }
  });
});

describe("getBangkokLastMonth", () => {
  it("spans the full previous calendar month (1st → last day)", () => {
    // Bangkok 'today' in June → previous month = May (31 days).
    const window = getBangkokLastMonth(new Date("2026-06-15T05:00:00Z"));
    expect(window).toHaveLength(31);
    expect(window[0].dateYmd).toBe("2026-05-01");
    expect(window[window.length - 1].dateYmd).toBe("2026-05-31");
  });

  it("handles a 30-day previous month", () => {
    // May → previous month = April (30 days).
    const window = getBangkokLastMonth(new Date("2026-05-10T05:00:00Z"));
    expect(window).toHaveLength(30);
    expect(window[0].dateYmd).toBe("2026-04-01");
    expect(window[window.length - 1].dateYmd).toBe("2026-04-30");
  });

  it("returns the full previous February in a leap year (29 days)", () => {
    // 2024 is a leap year → March's previous month = Feb with 29 days.
    const window = getBangkokLastMonth(new Date("2024-03-10T05:00:00Z"));
    expect(window).toHaveLength(29);
    expect(window[window.length - 1].dateYmd).toBe("2024-02-29");
  });

  it("returns 28 days for February in a non-leap year", () => {
    const window = getBangkokLastMonth(new Date("2026-03-10T05:00:00Z"));
    expect(window).toHaveLength(28);
    expect(window[window.length - 1].dateYmd).toBe("2026-02-28");
  });

  it("crosses the year boundary: January's previous month is the prior December", () => {
    const window = getBangkokLastMonth(new Date("2026-01-10T05:00:00Z"));
    expect(window).toHaveLength(31);
    expect(window[0].dateYmd).toBe("2025-12-01");
    expect(window[window.length - 1].dateYmd).toBe("2025-12-31");
  });

  it("uses the ICT-projected month, not the raw UTC month", () => {
    // 2026-06-30T18:00Z = 2026-07-01T01:00 ICT → 'today' is July 1 →
    // previous month = June (30 days).
    const window = getBangkokLastMonth(new Date("2026-06-30T18:00:00Z"));
    expect(window).toHaveLength(30);
    expect(window[0].dateYmd).toBe("2026-06-01");
    expect(window[window.length - 1].dateYmd).toBe("2026-06-30");
  });

  it("derives each entry's dayOfWeek consistently with dayOfWeekFor", () => {
    const window = getBangkokLastMonth(new Date("2026-06-15T05:00:00Z"));
    for (const entry of window) {
      expect(entry.dayOfWeek).toBe(dayOfWeekFor(entry.dateYmd));
    }
  });
});
