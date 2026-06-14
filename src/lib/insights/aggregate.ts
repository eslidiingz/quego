/**
 * Pure (browser-safe) aggregation for the shop report dashboard (รายงานร้าน,
 * OPP-19 Phase 1).
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

/**
 * Selectable lookback windows. The rolling-day windows (7/30/90) keep their
 * numeric meaning; the calendar windows ("month" = this month, "lastmonth" =
 * previous full month) are resolved to concrete dates by the service layer, so
 * the pure aggregate never reads a clock.
 */
export const INSIGHTS_RANGES = ["7", "30", "90", "month", "lastmonth"] as const;
export type InsightsRange = (typeof INSIGHTS_RANGES)[number];
export const DEFAULT_INSIGHTS_RANGE: InsightsRange = "30";

/** Coerce a `?range=` query value to a valid window key, default = 30 days. */
export function parseRange(raw: string | undefined): InsightsRange {
  return (INSIGHTS_RANGES as readonly string[]).includes(raw ?? "")
    ? (raw as InsightsRange)
    : DEFAULT_INSIGHTS_RANGE;
}

/** A booking projected to just the fields analytics needs. */
export type InsightsBooking = {
  bookingDate: string; // YYYY-MM-DD
  slotTime: string; // HH:MM
  durationMinutes: number;
  staffId: string | null;
  serviceId: string | null;
  status: "confirmed" | "cancelled" | "completed";
  /** Snapshotted service price; null when unknown. */
  price: number | null;
};

/** An active, service-providing staff member to break utilization down by. */
export type InsightsStaff = { id: string; name: string };

/** A shop service, for resolving revenue-by-service names. */
export type InsightsService = { id: string; name: string };

export type BusyHourBucket = {
  /** Hour of day, 0–23. */
  hour: number;
  /** Active bookings (confirmed+completed) that start in this hour. */
  count: number;
};

/**
 * One staff member ranked by revenue. Merges the legacy utilization concept
 * with revenue so the staff section is a single richer list (revenue desc).
 */
export type RevenueByStaff = {
  /** null for the synthetic single-queue line of a staffless shop. */
  staffId: string | null;
  name: string;
  revenue: number;
  bookingCount: number;
  bookedMinutes: number;
  /** 0–1, capped. Booked minutes ÷ one line's open minutes over the window. */
  utilization: number;
};

/** One service ranked by the revenue it brought the shop (revenue desc). */
export type RevenueByService = {
  serviceId: string | null;
  name: string;
  revenue: number;
  bookingCount: number;
};

export type ShopInsights = {
  /** Length of the window in days (informational; calendar windows vary). */
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
  /** Revenue ÷ active booking count; 0 when there are no active bookings. */
  avgTicket: number;
  /** Total open minutes of a single service line across the window. */
  lineMinutes: number;
  /** Parallel service lines = max(active staff, 1). */
  capacity: number;
  busyByHour: BusyHourBucket[];
  /** The hour with the most bookings (null when the window is empty). */
  peakHour: number | null;
  /** Per-staff rows ranked by revenue desc (replaces the old utilization list). */
  revenueByStaff: RevenueByStaff[];
  /** Per-service rows ranked by revenue desc. */
  revenueByService: RevenueByService[];
  /** False when there were no bookings at all (active or cancelled) in the window. */
  hasData: boolean;
  /** True when a staff/service filter is currently applied. */
  hasFilter: boolean;
  /** True when the unfiltered window has data but the filter excludes everything. */
  filteredToZero: boolean;
};

/**
 * Compute every dashboard metric from raw rows. Pure — no I/O, no clock reads
 * (the caller supplies `windowDates` so the result is deterministic per input).
 *
 * Optional `filterStaffIds` / `filterServiceIds` narrow the booking set used
 * for ALL booking-derived metrics. Both are multi-select: a booking passes when
 * its staff is in `filterStaffIds` (or that list is empty = all) AND its service
 * is in `filterServiceIds` (or empty = all). Fill-rate & utilization still
 * divide by the shop's capacity/line-minutes, so under a filter they read as
 * "share of total capacity for the current selection". Empty/undefined = no
 * filter for that group.
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
  /** All shop services (active or not) for revenue-by-service name resolution. */
  services?: InsightsService[];
  filterStaffIds?: string[];
  filterServiceIds?: string[];
}): ShopInsights {
  const {
    rangeDays,
    windowDates,
    hours,
    bookings,
    staff,
    services = [],
    filterStaffIds = [],
    filterServiceIds = [],
  } = input;

  const hasFilter = filterStaffIds.length > 0 || filterServiceIds.length > 0;
  const staffFilterSet = new Set(filterStaffIds);
  const serviceFilterSet = new Set(filterServiceIds);

  // Apply the multi-select filters to the booking set used for every
  // booking-derived metric. An empty group matches all. The unfiltered count
  // drives `filteredToZero`.
  const filtered = bookings.filter((b) => {
    if (staffFilterSet.size > 0 && (b.staffId == null || !staffFilterSet.has(b.staffId)))
      return false;
    if (
      serviceFilterSet.size > 0 &&
      (b.serviceId == null || !serviceFilterSet.has(b.serviceId))
    )
      return false;
    return true;
  });

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

  // --- Single pass over filtered bookings: counts, minutes, hour + buckets. ---
  let bookedMin = 0;
  let totalBookings = 0;
  let cancelled = 0;
  let revenue = 0;
  const hourCounts = new Array<number>(24).fill(0);
  const staffMinutes = new Map<string | null, number>();
  const staffRevenue = new Map<string | null, number>();
  const staffCount = new Map<string | null, number>();
  const serviceRevenue = new Map<string | null, number>();
  const serviceCount = new Map<string | null, number>();

  for (const b of filtered) {
    if (b.status === "cancelled") {
      cancelled += 1;
      continue;
    }
    // confirmed or completed = an "active" booking that consumed a line.
    totalBookings += 1;
    bookedMin += b.durationMinutes;

    const hour = Math.floor(hhmmToMinutes(b.slotTime) / 60);
    if (hour >= 0 && hour < 24) hourCounts[hour] += 1;

    staffMinutes.set(b.staffId, (staffMinutes.get(b.staffId) ?? 0) + b.durationMinutes);
    staffCount.set(b.staffId, (staffCount.get(b.staffId) ?? 0) + 1);
    serviceCount.set(b.serviceId, (serviceCount.get(b.serviceId) ?? 0) + 1);

    // The window is always past dates, so any non-cancelled booking was served
    // (no-show is folded into cancelled). Count revenue across all active
    // bookings — not just those a shop bothered to mark "completed" — so the
    // figure tracks `totalBookings`/fill-rate instead of reading ฿0 whenever
    // completion isn't diligently recorded. Skip null prices for revenue but
    // still count the booking above.
    if (b.price != null) {
      revenue += b.price;
      staffRevenue.set(b.staffId, (staffRevenue.get(b.staffId) ?? 0) + b.price);
      serviceRevenue.set(b.serviceId, (serviceRevenue.get(b.serviceId) ?? 0) + b.price);
    }
  }

  const totalAll = totalBookings + cancelled;
  const fillRate =
    availableCapacityMin > 0 ? Math.min(1, bookedMin / availableCapacityMin) : 0;
  const cancellationRate = totalAll > 0 ? cancelled / totalAll : 0;
  const avgTicket = totalBookings > 0 ? revenue / totalBookings : 0;

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

  const revenueByStaff = buildRevenueByStaff({
    staff,
    lineMinutes,
    staffMinutes,
    staffRevenue,
    staffCount,
    staffFilterSet,
  });

  const revenueByService = buildRevenueByService({
    services,
    serviceRevenue,
    serviceCount,
  });

  return {
    rangeDays,
    windowStart: windowDates[0]?.dateYmd ?? "",
    windowEnd: windowDates[windowDates.length - 1]?.dateYmd ?? "",
    totalBookings,
    fillRate,
    cancellationRate,
    revenue,
    avgTicket,
    lineMinutes,
    capacity,
    busyByHour,
    peakHour,
    revenueByStaff,
    revenueByService,
    hasData: totalAll > 0,
    hasFilter,
    // True only when the window genuinely has bookings but the filter hid them.
    filteredToZero: hasFilter && bookings.length > 0 && filtered.length === 0,
  };
}

/**
 * Per-staff rows ranked by revenue. Denominator for utilization = one line's
 * open minutes (each staff member is exactly one parallel line). Every current
 * booking is assigned a concrete staff at creation time (`createBooking`
 * resolves "ใช้ร้านจัดให้"/any-staff to a real person before insert), so a
 * staffed shop's report shows ONLY real staff — historical null-staff bookings
 * (made before the shop added staff) are intentionally omitted from this
 * breakdown rather than surfaced as a "ไม่ระบุพนักงาน" row. A shop with no
 * staff at all still gets a single synthetic "คิวรวม" line. When a staff filter
 * is active, only the selected staff rows show.
 */
function buildRevenueByStaff({
  staff,
  lineMinutes,
  staffMinutes,
  staffRevenue,
  staffCount,
  staffFilterSet,
}: {
  staff: InsightsStaff[];
  lineMinutes: number;
  staffMinutes: Map<string | null, number>;
  staffRevenue: Map<string | null, number>;
  staffCount: Map<string | null, number>;
  staffFilterSet: Set<string>;
}): RevenueByStaff[] {
  const utilFor = (mins: number) =>
    lineMinutes > 0 ? Math.min(1, mins / lineMinutes) : 0;

  const rows: RevenueByStaff[] = [];

  if (staff.length > 0) {
    for (const s of staff) {
      // When a staff filter is active, only the selected staff are relevant.
      if (staffFilterSet.size > 0 && !staffFilterSet.has(s.id)) continue;
      const mins = staffMinutes.get(s.id) ?? 0;
      rows.push({
        staffId: s.id,
        name: s.name,
        revenue: staffRevenue.get(s.id) ?? 0,
        bookingCount: staffCount.get(s.id) ?? 0,
        bookedMinutes: mins,
        utilization: utilFor(mins),
      });
    }

    // Bookings made before the shop added staff carry staffId = null. They are
    // deliberately NOT shown: a staffed shop assigns a concrete person to every
    // booking at creation, so a "ไม่ระบุพนักงาน" row would only reflect stale
    // pre-staff history and confuse the per-staff revenue ranking.
  } else {
    const mins = staffMinutes.get(null) ?? 0;
    rows.push({
      staffId: null,
      name: "คิวรวม (ไม่ระบุพนักงาน)",
      revenue: staffRevenue.get(null) ?? 0,
      bookingCount: staffCount.get(null) ?? 0,
      bookedMinutes: mins,
      utilization: utilFor(mins),
    });
  }

  return rows.sort((a, b) => b.revenue - a.revenue);
}

/**
 * Per-service rows ranked by revenue. Resolves service id→name from the shop's
 * service list; null service_id → "ไม่ระบุบริการ"; a service_id with no match
 * (deleted service) → "บริการอื่นๆ". Only services that actually appear in the
 * (filtered) bookings are returned.
 */
function buildRevenueByService({
  services,
  serviceRevenue,
  serviceCount,
}: {
  services: InsightsService[];
  serviceRevenue: Map<string | null, number>;
  serviceCount: Map<string | null, number>;
}): RevenueByService[] {
  const nameById = new Map(services.map((s) => [s.id, s.name]));

  const rows: RevenueByService[] = [];
  for (const [serviceId, count] of serviceCount) {
    const name =
      serviceId == null
        ? "ไม่ระบุบริการ"
        : (nameById.get(serviceId) ?? "บริการอื่นๆ");
    rows.push({
      serviceId,
      name,
      revenue: serviceRevenue.get(serviceId) ?? 0,
      bookingCount: count,
    });
  }

  return rows.sort((a, b) => b.revenue - a.revenue);
}
