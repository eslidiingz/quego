/**
 * Pure (browser-safe) aggregation for the shop insights dashboard (OPP-19).
 *
 * Lives in `lib/insights/` (no `server-only` marker) so the metric math is a
 * single source of truth, unit-testable and SSR-safe — the server service
 * (`services/insights.ts`) only does the DB I/O and hands raw rows here.
 *
 * Metrics are measured in MINUTES, not slot counts: because each service can
 * have a different duration there is no fixed slot grid, so "how busy is the
 * shop" is best expressed as booked service-minutes over available open-minutes
 * (the same utilization model salons like Fresha/Vagaro use).
 */

import {
  hhmmToMinutes,
  type BusinessHour,
  type DayOfWeek,
} from "@/lib/booking/slot-math";

/** Selectable lookback windows, in days. */
export const INSIGHTS_RANGES = [7, 30, 90] as const;
export type InsightsRange = (typeof INSIGHTS_RANGES)[number];
export const DEFAULT_INSIGHTS_RANGE: InsightsRange = 30;

/** Coerce a `?range=` query value to a valid window, falling back to default. */
export function parseRange(raw: string | undefined): InsightsRange {
  const n = Number(raw);
  return (INSIGHTS_RANGES as readonly number[]).includes(n)
    ? (n as InsightsRange)
    : DEFAULT_INSIGHTS_RANGE;
}

/** A booking projected to just the fields analytics needs. */
export type InsightsBooking = {
  bookingDate: string; // YYYY-MM-DD
  slotTime: string; // HH:MM
  durationMinutes: number;
  staffId: string | null;
  status: "confirmed" | "cancelled" | "completed";
  /** Snapshotted service price; null when unknown. */
  price: number | null;
};

/** An active, service-providing staff member to break utilization down by. */
export type InsightsStaff = { id: string; name: string };

export type BusyHourBucket = {
  /** Hour of day, 0–23. */
  hour: number;
  /** Active bookings (confirmed+completed) that start in this hour. */
  count: number;
};

export type StaffUtilization = {
  /** null for the synthetic single-queue line of a staffless shop. */
  staffId: string | null;
  name: string;
  bookedMinutes: number;
  /** 0–1, capped. Booked minutes ÷ one line's open minutes over the window. */
  utilization: number;
};

export type ShopInsights = {
  rangeDays: number;
  /** Oldest date in window (YYYY-MM-DD). */
  windowStart: string;
  /** Newest date in window — yesterday (YYYY-MM-DD). */
  windowEnd: string;
  /** Active bookings (confirmed+completed) in the window. */
  totalBookings: number;
  /** 0–1, capped. */
  fillRate: number;
  /** 0–1. */
  cancellationRate: number;
  /** Estimated revenue (฿) from served (non-cancelled) bookings with a known price. */
  revenue: number;
  /** Total open minutes of a single service line across the window. */
  lineMinutes: number;
  /** Parallel service lines = max(active staff, 1). */
  capacity: number;
  busyByHour: BusyHourBucket[];
  /** The hour with the most bookings (null when the window is empty). */
  peakHour: number | null;
  staff: StaffUtilization[];
  /** False when there were no bookings at all (active or cancelled). */
  hasData: boolean;
};

/**
 * Compute every dashboard metric from raw rows. Pure — no I/O, no clock reads
 * (the caller supplies `windowDates` so the result is deterministic per input).
 */
export function computeShopInsights(input: {
  rangeDays: number;
  /** Window dates oldest→newest, each tagged with its day-of-week. */
  windowDates: { dateYmd: string; dayOfWeek: DayOfWeek }[];
  /** Business hours indexed positionally by day-of-week (length 7). */
  hours: BusinessHour[];
  bookings: InsightsBooking[];
  /** Active, service-providing staff. Empty ⇒ single-queue shop. */
  staff: InsightsStaff[];
}): ShopInsights {
  const { rangeDays, windowDates, hours, bookings, staff } = input;

  // --- Available open-minutes of one service line across the window. ---
  let lineMinutes = 0;
  for (const { dayOfWeek } of windowDates) {
    const h = hours[dayOfWeek];
    if (h?.isOpen && h.openTime && h.closeTime) {
      const span = hhmmToMinutes(h.closeTime) - hhmmToMinutes(h.openTime);
      if (span > 0) lineMinutes += span;
    }
  }

  const capacity = Math.max(staff.length, 1);
  const availableCapacityMin = lineMinutes * capacity;

  // --- Single pass over bookings: counts, minutes, hour + staff buckets. ---
  let bookedMin = 0;
  let totalBookings = 0;
  let cancelled = 0;
  let revenue = 0;
  const hourCounts = new Array<number>(24).fill(0);
  const staffMinutes = new Map<string | null, number>();

  for (const b of bookings) {
    if (b.status === "cancelled") {
      cancelled += 1;
      continue;
    }
    // confirmed or completed = an "active" booking that consumed a line.
    totalBookings += 1;
    bookedMin += b.durationMinutes;

    const hour = Math.floor(hhmmToMinutes(b.slotTime) / 60);
    if (hour >= 0 && hour < 24) hourCounts[hour] += 1;

    staffMinutes.set(
      b.staffId,
      (staffMinutes.get(b.staffId) ?? 0) + b.durationMinutes,
    );

    // The window is always past dates, so any non-cancelled booking was served
    // (no-show is folded into cancelled). Count revenue across all active
    // bookings — not just those a shop bothered to mark "completed" — so the
    // figure tracks `totalBookings`/fill-rate instead of reading ฿0 whenever
    // completion isn't diligently recorded.
    if (b.price != null) revenue += b.price;
  }

  const totalAll = totalBookings + cancelled;
  const fillRate =
    availableCapacityMin > 0 ? Math.min(1, bookedMin / availableCapacityMin) : 0;
  const cancellationRate = totalAll > 0 ? cancelled / totalAll : 0;

  // --- Busy-by-hour: span the shop's open hours across the week so the chart
  //     is compact (earliest open hour … latest close hour). Falls back to
  //     only data-bearing hours when no business hours are configured. ---
  let openHourStart: number | null = null;
  let openHourEnd: number | null = null;
  for (const h of hours) {
    if (h?.isOpen && h.openTime && h.closeTime) {
      const startH = Math.floor(hhmmToMinutes(h.openTime) / 60);
      const endH = Math.ceil(hhmmToMinutes(h.closeTime) / 60); // round up so last partial hour shows
      openHourStart = openHourStart == null ? startH : Math.min(openHourStart, startH);
      openHourEnd = openHourEnd == null ? endH : Math.max(openHourEnd, endH);
    }
  }

  const busyByHour: BusyHourBucket[] = [];
  if (openHourStart != null && openHourEnd != null && openHourEnd > openHourStart) {
    for (let hr = openHourStart; hr < openHourEnd; hr += 1) {
      busyByHour.push({ hour: hr, count: hourCounts[hr] ?? 0 });
    }
  } else {
    for (let hr = 0; hr < 24; hr += 1) {
      if (hourCounts[hr] > 0) busyByHour.push({ hour: hr, count: hourCounts[hr] });
    }
  }

  let peakHour: number | null = null;
  let peakCount = 0;
  for (const b of busyByHour) {
    if (b.count > peakCount) {
      peakCount = b.count;
      peakHour = b.hour;
    }
  }

  // --- Per-staff utilization. Denominator = one line's open minutes (each
  //     staff member is exactly one parallel line). null-staff (legacy
  //     single-queue) minutes are only surfaced when the shop has no staff. ---
  let staffUtil: StaffUtilization[];
  if (staff.length > 0) {
    staffUtil = staff
      .map((s) => {
        const mins = staffMinutes.get(s.id) ?? 0;
        return {
          staffId: s.id,
          name: s.name,
          bookedMinutes: mins,
          utilization: lineMinutes > 0 ? Math.min(1, mins / lineMinutes) : 0,
        };
      })
      .sort((a, b) => b.utilization - a.utilization);

    // Bookings made before the shop added staff carry staffId = null. Their
    // minutes still count toward bookedMin/fillRate, so surface them as an
    // explicit trailing row — otherwise the per-staff bars silently fail to add
    // up to the overall fill rate for shops that adopted staff mid-window.
    const unassignedMin = staffMinutes.get(null) ?? 0;
    if (unassignedMin > 0) {
      staffUtil.push({
        staffId: null,
        name: "ไม่ระบุพนักงาน",
        bookedMinutes: unassignedMin,
        utilization: lineMinutes > 0 ? Math.min(1, unassignedMin / lineMinutes) : 0,
      });
    }
  } else {
    const mins = staffMinutes.get(null) ?? 0;
    staffUtil = [
      {
        staffId: null,
        name: "คิวรวม (ไม่ระบุพนักงาน)",
        bookedMinutes: mins,
        utilization: lineMinutes > 0 ? Math.min(1, mins / lineMinutes) : 0,
      },
    ];
  }

  return {
    rangeDays,
    windowStart: windowDates[0]?.dateYmd ?? "",
    windowEnd: windowDates[windowDates.length - 1]?.dateYmd ?? "",
    totalBookings,
    fillRate,
    cancellationRate,
    revenue,
    lineMinutes,
    capacity,
    busyByHour,
    peakHour,
    staff: staffUtil,
    hasData: totalAll > 0,
  };
}
