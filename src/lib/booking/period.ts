/**
 * Time-period filtering for a customer's booking list ("คิวของฉัน").
 *
 * Pure, browser-safe calendar math over "YYYY-MM-DD" strings — no DB, no Intl
 * beyond the caller-supplied Bangkok "today". Mirrors slot-math.ts in being
 * shareable client+server so the URL param and any future client filter can
 * never disagree about which dates fall in a period.
 *
 * Week is Monday-start (Thai convention). Month is the calendar month. Each
 * window is an INCLUSIVE [start, end] date range covering both past and
 * upcoming bookings within it; "all" is unbounded.
 */
import { dayOfWeekFor, getBangkokToday } from "@/lib/time/bangkok";

export const BOOKING_PERIODS = ["today", "week", "month", "all"] as const;
export type BookingPeriod = (typeof BOOKING_PERIODS)[number];

export const BOOKING_PERIOD_LABELS: Record<BookingPeriod, string> = {
  today: "วันนี้",
  week: "สัปดาห์นี้",
  month: "เดือนนี้",
  all: "ทั้งหมด",
};

/**
 * Default to "today" so the bare /me/bookings URL opens on today's queue —
 * matching the shop bookings tabs, which also default to "วันนี้". Anything
 * unrecognised collapses to the same default.
 */
export function parseBookingPeriod(raw: string | undefined): BookingPeriod {
  return BOOKING_PERIODS.includes(raw as BookingPeriod)
    ? (raw as BookingPeriod)
    : "today";
}

/** Add `deltaDays` to a "YYYY-MM-DD" via UTC-midnight arithmetic. */
function shiftYmd(dateYmd: string, deltaDays: number): string {
  const [y, m, d] = dateYmd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d) + deltaDays * 86_400_000);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

/**
 * Inclusive [start, end] Bangkok date window for a period, or null for "all".
 */
export function bookingPeriodWindow(
  period: BookingPeriod,
  today: string = getBangkokToday(),
): { start: string; end: string } | null {
  switch (period) {
    case "today":
      return { start: today, end: today };
    case "week": {
      // dayOfWeekFor: 0 = Sunday … 6 = Saturday. Steps back to Monday.
      const toMonday = (dayOfWeekFor(today) + 6) % 7;
      const start = shiftYmd(today, -toMonday);
      return { start, end: shiftYmd(start, 6) };
    }
    case "month": {
      const [y, m] = today.split("-").map(Number);
      const mm = String(m).padStart(2, "0");
      // Day 0 of next month = last day of this month.
      const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
      return {
        start: `${y}-${mm}-01`,
        end: `${y}-${mm}-${String(lastDay).padStart(2, "0")}`,
      };
    }
    case "all":
      return null;
  }
}

/** Whether a booking date falls within the given period. */
export function isBookingInPeriod(
  dateYmd: string,
  period: BookingPeriod,
  today: string = getBangkokToday(),
): boolean {
  const window = bookingPeriodWindow(period, today);
  if (!window) return true;
  return dateYmd >= window.start && dateYmd <= window.end;
}
