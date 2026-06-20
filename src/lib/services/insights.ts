import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  getBangkokRecentDates,
  getBangkokMonthToDate,
  getBangkokLastMonth,
} from "@/lib/time/bangkok";
import {
  DAYS_OF_WEEK,
  type BusinessHour,
  type DayOfWeek,
} from "@/lib/booking/slot-math";
import {
  computeShopInsights,
  type InsightsBooking,
  type InsightsStaff,
  type InsightsService,
  type InsightsExpense,
  type InsightsRange,
  type ShopInsights,
} from "@/lib/insights/aggregate";

/**
 * Shop report service (รายงานร้าน, OPP-19 Phase 1). Reads the data the aggregate
 * needs over the service-role client (RLS deny-all), then defers ALL metric
 * math to the pure `computeShopInsights` helper so this module stays a thin
 * I/O shim. It also runs the aggregate twice — current window + the
 * immediately-preceding equal-length window — to derive period-over-period
 * deltas, and returns the staff/service option lists the filter UI needs.
 *
 * SRP: fetch + shape rows + window arithmetic. No metric logic, no UI concerns.
 */

export type {
  ShopInsights,
  InsightsRange,
} from "@/lib/insights/aggregate";

/** Percent-change deltas vs the immediately-preceding equal-length window. */
export type InsightsDeltas = {
  /** Fractional change (0.12 = +12%). null when there's no prior-period base. */
  revenue: number | null;
  totalBookings: number | null;
  avgTicket: number | null;
  expensesTotal: number | null;
  netProfit: number | null;
};

/** A selectable option for the filter sheet. */
export type FilterOption = { id: string; name: string };

/** Everything the report page renders: metrics + comparison + filter options. */
export type ShopReport = {
  insights: ShopInsights;
  deltas: InsightsDeltas;
  staffOptions: FilterOption[];
  serviceOptions: FilterOption[];
};

type WindowDate = { dateYmd: string; dayOfWeek: DayOfWeek };

/** Booking statuses the analytics model understands; others are skipped. */
const VALID_BOOKING_STATUSES = new Set<string>([
  "confirmed",
  "cancelled",
  "completed",
]);

/** Postgres `numeric` arrives over the wire as a string — coerce to number. */
function priceFromDb(value: number | string | null): number | null {
  if (value == null) return null;
  const n = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(n) ? n : null;
}

/**
 * Resolve a range key to its current window dates (oldest→newest, INCLUDING
 * today) so the report reconciles with the overview's live "ยอดวันนี้" figure.
 * Calendar windows ("month"/"lastmonth") read the Bangkok clock here; the pure
 * aggregate stays clock-free. "lastmonth" is always a complete past month.
 */
function resolveWindow(range: InsightsRange): WindowDate[] {
  switch (range) {
    case "7":
      return getBangkokRecentDates(7);
    case "90":
      return getBangkokRecentDates(90);
    case "month":
      return getBangkokMonthToDate();
    case "lastmonth":
      return getBangkokLastMonth();
    case "30":
    default:
      return getBangkokRecentDates(30);
  }
}

/**
 * The immediately-preceding window of the SAME length, ending the day before
 * `current` starts. Used for period-over-period deltas. Empty when the current
 * window is empty (e.g. "month" on the 1st) — deltas then report null.
 */
function precedingWindow(current: WindowDate[]): WindowDate[] {
  if (current.length === 0) return [];
  const len = current.length;
  const [sy, sm, sd] = current[0].dateYmd.split("-").map(Number);
  const startMs = Date.UTC(sy, sm - 1, sd);
  const dayMs = 24 * 60 * 60 * 1000;
  const out: WindowDate[] = [];
  // Fill backwards then we already produce oldest→newest by counting down.
  for (let i = len; i >= 1; i -= 1) {
    const ms = startMs - i * dayMs;
    const day = new Date(ms);
    const ymd = `${day.getUTCFullYear()}-${String(day.getUTCMonth() + 1).padStart(2, "0")}-${String(day.getUTCDate()).padStart(2, "0")}`;
    out.push({ dateYmd: ymd, dayOfWeek: day.getUTCDay() as DayOfWeek });
  }
  return out;
}

/** Fractional change current vs prior; null when prior is 0 (no meaningful base). */
function delta(current: number, prior: number): number | null {
  if (prior <= 0) return null;
  return (current - prior) / prior;
}

/**
 * Aggregate one shop's bookings over the selected window into the full report.
 * All reads are scoped by `shopId`, which MUST come from the caller's verified
 * session. `filterStaffIds` / `filterServiceIds` (multi-select; empty = no
 * filter) narrow the booking-derived metrics for BOTH the current and the
 * comparison window.
 */
export async function getShopReport(
  shopId: string,
  range: InsightsRange,
  opts: { filterStaffIds?: string[]; filterServiceIds?: string[] } = {},
): Promise<ShopReport> {
  const { filterStaffIds = [], filterServiceIds = [] } = opts;
  const supabase = getSupabaseAdmin();

  const currentWindow = resolveWindow(range);
  const compareWindow = precedingWindow(currentWindow);

  // Fetch bookings across BOTH windows in one query, then partition in memory.
  const allDates = [...compareWindow, ...currentWindow];
  const queryStart = allDates.length > 0 ? allDates[0].dateYmd : "9999-12-31";
  const queryEnd =
    allDates.length > 0 ? allDates[allDates.length - 1].dateYmd : "0001-01-01";

  const [
    { data: bookingsData, error: bookingsError },
    { data: hoursData, error: hoursError },
    { data: staffData, error: staffError },
    { data: servicesData, error: servicesError },
    { data: expensesData, error: expensesError },
  ] = await Promise.all([
    // ALL statuses — cancelled rows are needed for the cancellation rate.
    supabase
      .from("bookings")
      .select(
        "booking_date, slot_time, service_duration_minutes, staff_id, service_id, status, service_price",
      )
      .eq("shop_id", shopId)
      .gte("booking_date", queryStart)
      .lte("booking_date", queryEnd),
    supabase
      .from("shop_business_hours")
      .select("day_of_week, is_open, open_time, close_time")
      .eq("shop_id", shopId),
    // Active service-providing staff = the parallel lines utilization splits by.
    supabase
      .from("shop_staff")
      .select("id, name")
      .eq("shop_id", shopId)
      .eq("is_active", true)
      .eq("provides_service", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    // All services (active or not) → resolve revenue-by-service names + filter
    // options. Inactive ones still own historical bookings in the window.
    supabase
      .from("shop_services")
      .select("id, name")
      .eq("shop_id", shopId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    // Expenses across the same window — aggregated into net profit. Shop-wide,
    // so no staff/service scoping here.
    supabase
      .from("shop_expenses")
      .select("expense_date, category, amount")
      .eq("shop_id", shopId)
      .gte("expense_date", queryStart)
      .lte("expense_date", queryEnd),
  ]);

  // Surface query failures loudly. Without this, the `?? []` fallbacks below
  // would turn any failed query into an all-zero "no data" dashboard — a silent
  // wrong answer the owner can't distinguish from a genuinely quiet period.
  if (bookingsError) {
    throw new Error(`insights: bookings query failed: ${bookingsError.message}`);
  }
  if (hoursError) {
    throw new Error(`insights: business hours query failed: ${hoursError.message}`);
  }
  if (staffError) {
    throw new Error(`insights: staff query failed: ${staffError.message}`);
  }
  if (servicesError) {
    throw new Error(`insights: services query failed: ${servicesError.message}`);
  }
  if (expensesError) {
    throw new Error(`insights: expenses query failed: ${expensesError.message}`);
  }

  const allBookings: InsightsBooking[] = (bookingsData ?? []).flatMap((b) => {
    // Validate the DB status BEFORE narrowing it to the analytics union: an
    // unrecognised status (e.g. a future one) must not fall through and be
    // counted as an active booking, which would silently inflate every metric.
    const status = b.status as string;
    if (!VALID_BOOKING_STATUSES.has(status)) return [];
    return [
      {
        bookingDate: b.booking_date as string,
        slotTime: (b.slot_time as string).slice(0, 5),
        durationMinutes: b.service_duration_minutes as number,
        staffId: (b.staff_id as string | null) ?? null,
        serviceId: (b.service_id as string | null) ?? null,
        status: status as InsightsBooking["status"],
        price: priceFromDb(b.service_price as number | string | null),
      },
    ];
  });

  const allExpenses: InsightsExpense[] = (expensesData ?? []).flatMap((e) => {
    const amount = priceFromDb(e.amount as number | string | null);
    if (amount == null) return [];
    return [
      {
        expenseDate: e.expense_date as string,
        category: (e.category as string) ?? "",
        amount,
      },
    ];
  });

  // Index business hours positionally by day-of-week (mirrors getBookingContext).
  const byDay = new Map<DayOfWeek, BusinessHour>();
  for (const h of hoursData ?? []) {
    const day = h.day_of_week as DayOfWeek;
    byDay.set(day, {
      dayOfWeek: day,
      isOpen: h.is_open as boolean,
      openTime: h.open_time ? (h.open_time as string).slice(0, 5) : null,
      closeTime: h.close_time ? (h.close_time as string).slice(0, 5) : null,
    });
  }
  const hours: BusinessHour[] = DAYS_OF_WEEK.map(
    (d) =>
      byDay.get(d) ?? {
        dayOfWeek: d,
        isOpen: false,
        openTime: null,
        closeTime: null,
      },
  );

  const staff: InsightsStaff[] = (staffData ?? []).map((s) => ({
    id: s.id as string,
    name: s.name as string,
  }));

  const services: InsightsService[] = (servicesData ?? []).map((s) => ({
    id: s.id as string,
    name: s.name as string,
  }));

  // Partition bookings into the two windows by date membership.
  const currentDateSet = new Set(currentWindow.map((d) => d.dateYmd));
  const compareDateSet = new Set(compareWindow.map((d) => d.dateYmd));
  const currentBookings = allBookings.filter((b) => currentDateSet.has(b.bookingDate));
  const compareBookings = allBookings.filter((b) => compareDateSet.has(b.bookingDate));
  const currentExpenses = allExpenses.filter((e) => currentDateSet.has(e.expenseDate));
  const compareExpenses = allExpenses.filter((e) => compareDateSet.has(e.expenseDate));

  const insights = computeShopInsights({
    rangeDays: currentWindow.length,
    windowDates: currentWindow,
    hours,
    bookings: currentBookings,
    staff,
    services,
    expenses: currentExpenses,
    filterStaffIds,
    filterServiceIds,
  });

  // Comparison window: same filters, so deltas reflect like-for-like.
  const prior = computeShopInsights({
    rangeDays: compareWindow.length,
    windowDates: compareWindow,
    hours,
    bookings: compareBookings,
    staff,
    services,
    expenses: compareExpenses,
    filterStaffIds,
    filterServiceIds,
  });

  const deltas: InsightsDeltas = {
    revenue: delta(insights.revenue, prior.revenue),
    totalBookings: delta(insights.totalBookings, prior.totalBookings),
    avgTicket: delta(insights.avgTicket, prior.avgTicket),
    expensesTotal: delta(insights.expensesTotal, prior.expensesTotal),
    netProfit: delta(insights.netProfit, prior.netProfit),
  };

  return {
    insights,
    deltas,
    staffOptions: staff.map((s) => ({ id: s.id, name: s.name })),
    serviceOptions: services.map((s) => ({ id: s.id, name: s.name })),
  };
}
