/**
 * Server-safe helpers for "what time/day is it right now in Bangkok?".
 * The business runs on ICT (UTC+7, no DST) so we always project current
 * time into that timezone, independent of where the server is hosted.
 *
 * SRP: time/day projection only. No business-hours comparison logic —
 * callers combine these with their own data.
 */

export type BangkokNow = {
  /** 0 = Sunday … 6 = Saturday — matches JS Date.getDay() / our DB convention. */
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  /** "HH:MM" 24-hour. */
  timeHHMM: string;
};

const WEEKDAY_TO_INDEX: Record<string, BangkokNow["dayOfWeek"]> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export function getBangkokNow(at: Date = new Date()): BangkokNow {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Bangkok",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(at);

  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "Sun";
  let hour = parts.find((p) => p.type === "hour")?.value ?? "00";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
  // Intl returns "24" at midnight on some runtimes — normalise to "00".
  if (hour === "24") hour = "00";

  return {
    dayOfWeek: WEEKDAY_TO_INDEX[weekday] ?? 0,
    timeHHMM: `${hour}:${minute}`,
  };
}

/**
 * Today's calendar date in Bangkok as a "YYYY-MM-DD" string. Used by the
 * booking flow to determine which dates are still bookable.
 */
export function getBangkokToday(at: Date = new Date()): string {
  // en-CA's ISO-style date output ("2026-05-26") is the safest formatter for
  // a YYYY-MM-DD shape without needing manual zero-padding.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
}

/**
 * Day-of-week for a Bangkok-local date string ("YYYY-MM-DD").
 * Days are timezone-agnostic at the calendar-date level, so we can derive
 * the day from a UTC-midnight parse without bouncing through Intl again.
 */
export function dayOfWeekFor(
  dateYmd: string,
): BangkokNow["dayOfWeek"] {
  const [y, m, d] = dateYmd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay() as BangkokNow["dayOfWeek"];
}

/**
 * Build a window of upcoming Bangkok calendar dates starting from today.
 * Returns `daysAhead` entries (today + (daysAhead-1) more days).
 */
export function getBangkokDateWindow(
  daysAhead: number,
  at: Date = new Date(),
): { dateYmd: string; dayOfWeek: BangkokNow["dayOfWeek"] }[] {
  const today = getBangkokToday(at);
  const [y, m, d] = today.split("-").map(Number);
  const base = Date.UTC(y, m - 1, d);
  const out: { dateYmd: string; dayOfWeek: BangkokNow["dayOfWeek"] }[] = [];
  for (let i = 0; i < daysAhead; i += 1) {
    const next = new Date(base + i * 24 * 60 * 60 * 1000);
    const ymd = `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-${String(next.getUTCDate()).padStart(2, "0")}`;
    out.push({
      dateYmd: ymd,
      dayOfWeek: next.getUTCDay() as BangkokNow["dayOfWeek"],
    });
  }
  return out;
}

/**
 * Build a window of recent Bangkok calendar dates ending TODAY (inclusive).
 * Returns `days` entries ordered oldest→newest: `[today-(days-1), …, today]`.
 * Today is a partial, in-progress day but is INCLUDED so the report's rolling
 * totals reconcile with the live "ยอดวันนี้" figure on the shop overview
 * (which also counts today). Fill-rate over the window is therefore slightly
 * understated on the current day — an acceptable trade for owner-visible
 * consistency, and fill-rate isn't surfaced on the report anyway.
 *
 * Mirror of `getBangkokDateWindow` (which counts forward) but anchored to end at
 * today — used by the shop insights dashboard (OPP-19) for the 7/30/90 presets.
 */
export function getBangkokRecentDates(
  days: number,
  at: Date = new Date(),
): { dateYmd: string; dayOfWeek: BangkokNow["dayOfWeek"] }[] {
  const today = getBangkokToday(at);
  const [y, m, d] = today.split("-").map(Number);
  const base = Date.UTC(y, m - 1, d);
  const out: { dateYmd: string; dayOfWeek: BangkokNow["dayOfWeek"] }[] = [];
  // i counts down from days-1 to 0 → oldest first, today last (i = 0).
  for (let i = days - 1; i >= 0; i -= 1) {
    const day = new Date(base - i * 24 * 60 * 60 * 1000);
    const ymd = `${day.getUTCFullYear()}-${String(day.getUTCMonth() + 1).padStart(2, "0")}-${String(day.getUTCDate()).padStart(2, "0")}`;
    out.push({
      dateYmd: ymd,
      dayOfWeek: day.getUTCDay() as BangkokNow["dayOfWeek"],
    });
  }
  return out;
}

/** YYYY-MM-DD for a UTC-midnight timestamp (the canonical calendar-date shape). */
function ymdFromUtc(ms: number): {
  dateYmd: string;
  dayOfWeek: BangkokNow["dayOfWeek"];
} {
  const day = new Date(ms);
  const ymd = `${day.getUTCFullYear()}-${String(day.getUTCMonth() + 1).padStart(2, "0")}-${String(day.getUTCDate()).padStart(2, "0")}`;
  return { dateYmd: ymd, dayOfWeek: day.getUTCDay() as BangkokNow["dayOfWeek"] };
}

/** Build an inclusive list of Bangkok calendar dates between two UTC-midnights. */
function datesBetween(
  startMs: number,
  endMs: number,
): { dateYmd: string; dayOfWeek: BangkokNow["dayOfWeek"] }[] {
  const out: { dateYmd: string; dayOfWeek: BangkokNow["dayOfWeek"] }[] = [];
  const dayMs = 24 * 60 * 60 * 1000;
  for (let ms = startMs; ms <= endMs; ms += dayMs) {
    out.push(ymdFromUtc(ms));
  }
  return out;
}

/**
 * The current Bangkok calendar month from its 1st up to and including TODAY
 * (month-to-date). Today is a partial day but is INCLUDED so the "เดือนนี้"
 * report reconciles with the live "ยอดวันนี้" figure on the shop overview.
 * Always returns at least one entry (today is always ≥ the 1st), so callers
 * never need to special-case an empty window.
 *
 * Used by the shop report (รายงานร้าน) "เดือนนี้" preset.
 */
export function getBangkokMonthToDate(
  at: Date = new Date(),
): { dateYmd: string; dayOfWeek: BangkokNow["dayOfWeek"] }[] {
  const today = getBangkokToday(at);
  const [y, m, d] = today.split("-").map(Number);
  const firstMs = Date.UTC(y, m - 1, 1);
  const todayMs = Date.UTC(y, m - 1, d);
  return datesBetween(firstMs, todayMs);
}

/**
 * The full PREVIOUS Bangkok calendar month (its 1st → its last day). Always a
 * complete past month, so no partial-day handling is needed.
 *
 * Used by the shop report (รายงานร้าน) "เดือนก่อน" preset.
 */
export function getBangkokLastMonth(
  at: Date = new Date(),
): { dateYmd: string; dayOfWeek: BangkokNow["dayOfWeek"] }[] {
  const today = getBangkokToday(at);
  const [y, m] = today.split("-").map(Number);
  // m is 1-based; Date.UTC handles month underflow (Jan → previous Dec).
  const firstMs = Date.UTC(y, m - 2, 1);
  // Day 0 of the current month = the last day of the previous month.
  const lastMs = Date.UTC(y, m - 1, 0);
  return datesBetween(firstMs, lastMs);
}

/**
 * A specific calendar month (`year`, `month` 1–12) as Bangkok dates, oldest→
 * newest. The window is CAPPED at today, so the current month returns
 * month-to-date (parity with `getBangkokMonthToDate`) and a wholly-future month
 * returns `[]`. Past months return the full 28–31 days.
 *
 * Used by the shop report (รายงานร้าน) month picker (กรองรายเดือน).
 */
export function getBangkokMonthWindow(
  year: number,
  month: number,
  at: Date = new Date(),
): { dateYmd: string; dayOfWeek: BangkokNow["dayOfWeek"] }[] {
  const today = getBangkokToday(at);
  const [ty, tm, td] = today.split("-").map(Number);
  const todayMs = Date.UTC(ty, tm - 1, td);
  const firstMs = Date.UTC(year, month - 1, 1);
  // Day 0 of the next month = the last day of this month.
  const lastMs = Date.UTC(year, month, 0);
  const endMs = Math.min(lastMs, todayMs);
  if (firstMs > endMs) return []; // entirely in the future
  return datesBetween(firstMs, endMs);
}

/**
 * A specific calendar year as Bangkok dates, oldest→newest. CAPPED at today, so
 * the current year returns year-to-date and a wholly-future year returns `[]`.
 * Past years return Jan 1 → Dec 31.
 *
 * Used by the shop report (รายงานร้าน) year picker (กรองรายปี).
 */
export function getBangkokYearWindow(
  year: number,
  at: Date = new Date(),
): { dateYmd: string; dayOfWeek: BangkokNow["dayOfWeek"] }[] {
  const today = getBangkokToday(at);
  const [ty, tm, td] = today.split("-").map(Number);
  const todayMs = Date.UTC(ty, tm - 1, td);
  const firstMs = Date.UTC(year, 0, 1);
  const lastMs = Date.UTC(year, 11, 31);
  const endMs = Math.min(lastMs, todayMs);
  if (firstMs > endMs) return []; // entirely in the future
  return datesBetween(firstMs, endMs);
}

/**
 * The current Bangkok calendar year from Jan 1 up to and including TODAY
 * (year-to-date). Today is a partial day but INCLUDED so the "ปีนี้" report
 * reconciles with the live "ยอดวันนี้" figure on the shop overview.
 *
 * Used by the shop report (รายงานร้าน) "ปีนี้" preset.
 */
export function getBangkokYearToDate(
  at: Date = new Date(),
): { dateYmd: string; dayOfWeek: BangkokNow["dayOfWeek"] }[] {
  const today = getBangkokToday(at);
  const [y] = today.split("-").map(Number);
  return getBangkokYearWindow(y, at);
}
