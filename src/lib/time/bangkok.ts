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
