/**
 * Pure (browser-safe) booking-domain types and slot math.
 *
 * Lives in `lib/booking/` rather than `lib/services/` so it doesn't carry
 * the `server-only` marker — both the server (`bookings.ts`) and the
 * customer-facing client form import from here.
 *
 * Services can each have a different duration, so a booking no longer maps to
 * a single fixed slot grid: it occupies the interval `[start, start+duration)`.
 * Availability is therefore an interval-overlap question, computed by the pure
 * helpers below and shared verbatim between the client picker and the
 * server-side validator so the two sides can't disagree.
 */

import { dayOfWeekFor } from "@/lib/time/bangkok";

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const DAYS_OF_WEEK: DayOfWeek[] = [0, 1, 2, 3, 4, 5, 6];

export type BusinessHour = {
  dayOfWeek: DayOfWeek;
  isOpen: boolean;
  /** HH:MM (24h). Null when the day is closed. */
  openTime: string | null;
  closeTime: string | null;
};

/**
 * A bookable service. `id` is null for the implicit single service that shops
 * without any defined services fall back to (duration from the shop's default
 * `service_duration_minutes`).
 */
export type BookingService = {
  id: string | null;
  name: string;
  durationMinutes: number;
  price: number | null;
  /**
   * IDs of active staff who can perform this service. null for single-queue
   * shops (no active staff configured). An empty array means active staff
   * exist but none are assigned to this service yet.
   */
  staffIds: string[] | null;
};

/** A staff member shown in the booking picker. */
export type StaffOption = {
  id: string;
  name: string;
  /** Job role shown as the card subtitle (e.g. "ช่างตัดผม"). */
  role: string | null;
};

/**
 * An existing active booking projected onto a day, expressed as a half-open
 * interval `[startMin, startMin+durationMin)` in minutes-from-midnight. The
 * picker uses these to decide which candidate start times still have a free
 * service line.
 */
export type BookedInterval = {
  date: string; // YYYY-MM-DD
  startMin: number;
  durationMin: number;
  /** Which staff line holds it; null for legacy single-queue shops. */
  staffId: string | null;
};

/**
 * Everything the client booking form needs to render the booking window
 * without round-tripping back to the server on every date or service change.
 */
export type BookingContext = {
  shop: {
    id: string;
    name: string;
    /** Default duration — also the duration of the implicit fallback service. */
    serviceDurationMinutes: number;
  };
  /** Active services; always at least one (an implicit fallback when empty). */
  services: BookingService[];
  /**
   * Parallel service lines = max(active staff, 1). Used for single-queue shops
   * and as a fallback; staffed shops derive per-service capacity from
   * `service.staffIds.length` in the booking form.
   */
  capacity: number;
  /** Active bookings across the window, as overlap intervals. */
  bookedIntervals: BookedInterval[];
  /** Indexed positionally so callers can do `hours[dayOfWeek]`. */
  hours: BusinessHour[];
  /** Inclusive boundaries of the booking window, Bangkok calendar dates. */
  windowStart: string;
  windowEnd: string;
  /** Today's Bangkok date — used by the client to mark today's past slots. */
  nowDate: string;
  nowTimeHHMM: string;
  /** Active staff for the staff-picker step. Empty for single-queue shops. */
  staff: StaffOption[];
};

/**
 * Generate the full list of slot start times for a single open day at a given
 * service duration. A slot must FIT inside the open window
 * (start + duration <= close), and slots are spaced by the duration.
 *
 * Shared between the server-side validator and the client picker so the two
 * sides can't disagree about which start times exist for a service.
 */
export function generateSlots(
  openTime: string,
  closeTime: string,
  durationMinutes: number,
): string[] {
  const open = hhmmToMinutes(openTime);
  const close = hhmmToMinutes(closeTime);
  if (open >= close || durationMinutes <= 0) return [];
  const out: string[] = [];
  for (let t = open; t + durationMinutes <= close; t += durationMinutes) {
    out.push(minutesToHHMM(t));
  }
  return out;
}

/** True when two half-open intervals `[aStart, aStart+aDur)` / `[bStart, …)` overlap. */
export function intervalsOverlap(
  aStart: number,
  aDur: number,
  bStart: number,
  bDur: number,
): boolean {
  return aStart < bStart + bDur && bStart < aStart + aDur;
}

/**
 * How many parallel service lines are occupied during `[startMin, +durationMin)`
 * on `date`. A staffed line counts once even if it holds several overlapping
 * bookings (it can't — the DB forbids it — but the set keeps the count honest);
 * legacy null-staff bookings each occupy the single shared line.
 *
 * `staffIdFilter` — when provided, only intervals whose `staffId` is in the
 * set contribute to the count. Pass it when evaluating availability for a
 * specific staff member or a subset of staff (e.g. those who can do a service).
 * Null-staff intervals are excluded when a filter is active (they belong to
 * the legacy single-queue lane, not to any filtered staff line).
 *
 * Compare against `capacity`: `busyLineCount >= capacity` ⇒ the candidate slot
 * is full.
 */
export function busyLineCount(
  intervals: readonly BookedInterval[],
  date: string,
  startMin: number,
  durationMin: number,
  staffIdFilter?: ReadonlySet<string> | null,
): number {
  let noStaff = 0;
  const busyStaff = new Set<string>();
  for (const iv of intervals) {
    if (iv.date !== date) continue;
    if (!intervalsOverlap(startMin, durationMin, iv.startMin, iv.durationMin)) {
      continue;
    }
    if (iv.staffId == null) {
      if (!staffIdFilter) noStaff += 1;
    } else {
      if (!staffIdFilter || staffIdFilter.has(iv.staffId)) {
        busyStaff.add(iv.staffId);
      }
    }
  }
  return noStaff + busyStaff.size;
}

export type SlotAvailability = {
  time: string; // HH:MM
  isAvailable: boolean;
  isFull: boolean;
  isPast: boolean;
};

/**
 * Evaluate every candidate start time for one service on one open day:
 * generate the grid for the service's duration, then mark each slot full (all
 * lines busy across its interval) or past (today only).
 *
 * `staffIdFilter` — when provided, only bookings for those staff IDs count
 * as busy lines. Used by the booking form when a specific staff member (or
 * a service-specific subset) is selected.
 */
export function evaluateSlots(params: {
  openTime: string;
  closeTime: string;
  durationMinutes: number;
  date: string;
  intervals: readonly BookedInterval[];
  capacity: number;
  isToday: boolean;
  nowHHMM: string;
  staffIdFilter?: ReadonlySet<string> | null;
}): SlotAvailability[] {
  const {
    openTime,
    closeTime,
    durationMinutes,
    date,
    intervals,
    capacity,
    isToday,
    nowHHMM,
    staffIdFilter,
  } = params;
  return generateSlots(openTime, closeTime, durationMinutes).map((time) => {
    const startMin = hhmmToMinutes(time);
    const isFull =
      busyLineCount(intervals, date, startMin, durationMinutes, staffIdFilter) >= capacity;
    const isPast = isToday && time <= nowHHMM;
    return { time, isFull, isPast, isAvailable: !isFull && !isPast };
  });
}

/** The day after a "YYYY-MM-DD" date, as a "YYYY-MM-DD" string. */
export function nextYmd(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-${String(next.getUTCDate()).padStart(2, "0")}`;
}

/**
 * Walk an inclusive "YYYY-MM-DD" window into one `{ dateYmd, dayOfWeek }` entry
 * per calendar day, ordered earliest → latest. String comparison is safe here
 * because the ISO date shape sorts chronologically. Shared by the date-chip
 * builder and the soonest-slot scan so both iterate the window identically.
 */
export function eachDateInWindow(
  windowStart: string,
  windowEnd: string,
): { dateYmd: string; dayOfWeek: DayOfWeek }[] {
  const out: { dateYmd: string; dayOfWeek: DayOfWeek }[] = [];
  let cursor = windowStart;
  while (cursor <= windowEnd) {
    out.push({ dateYmd: cursor, dayOfWeek: dayOfWeekFor(cursor) });
    cursor = nextYmd(cursor);
  }
  return out;
}

/** A concrete bookable opening: the earliest free start time in the window. */
export type SoonestSlot = { date: string; time: string };

/**
 * Scan the window day-by-day and return the earliest still-bookable slot for a
 * given capacity + staff filter, or null if nothing is free. Powers the
 * "ใครก็ได้ = เร็วกว่า" hint: running it once per staff choice lets the picker
 * show each option's soonest opening, so a customer can SEE that letting the
 * shop assign any capable staff (capacity = #staff) frees up earlier than
 * pinning one person (capacity = 1).
 *
 * Reuses `evaluateSlots`, so "past today" and "all lines busy" are excluded
 * exactly as in the grid. `takenKeys` (optional) drops slots this client just
 * lost to a race — same `"YYYY-MM-DD HH:MM"` key shape the form uses.
 */
export function findSoonestSlot(params: {
  days: readonly { dateYmd: string; dayOfWeek: DayOfWeek }[];
  hours: readonly BusinessHour[];
  durationMinutes: number;
  intervals: readonly BookedInterval[];
  capacity: number;
  nowDate: string;
  nowHHMM: string;
  staffIdFilter?: ReadonlySet<string> | null;
  takenKeys?: ReadonlySet<string>;
}): SoonestSlot | null {
  const {
    days,
    hours,
    durationMinutes,
    intervals,
    capacity,
    nowDate,
    nowHHMM,
    staffIdFilter,
    takenKeys,
  } = params;
  for (const { dateYmd, dayOfWeek } of days) {
    const h = hours[dayOfWeek];
    if (!h?.isOpen || !h.openTime || !h.closeTime) continue;
    const avail = evaluateSlots({
      openTime: h.openTime,
      closeTime: h.closeTime,
      durationMinutes,
      date: dateYmd,
      intervals,
      capacity,
      isToday: dateYmd === nowDate,
      nowHHMM,
      staffIdFilter,
    });
    for (const s of avail) {
      if (s.isAvailable && !takenKeys?.has(`${dateYmd} ${s.time}`)) {
        return { date: dateYmd, time: s.time };
      }
    }
  }
  return null;
}

export function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToHHMM(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
