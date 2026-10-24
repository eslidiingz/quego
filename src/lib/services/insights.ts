import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  getBangkokRecentDates,
  getBangkokMonthToDate,
  getBangkokYearToDate,
  getBangkokMonthWindow,
  getBangkokYearWindow,
  getBangkokToday,
} from "@/lib/time/bangkok";
import {
  DAYS_OF_WEEK,
  type BusinessHour,
  type DayOfWeek,
} from "@/lib/booking/slot-math";
import {
  computeShopInsights,
  type InsightsBookingGroup,
  type InsightsStaff,
  type InsightsService,
  type InsightsExpense,
  type ReportRange,
  type ShopInsights,
} from "@/lib/insights/aggregate";

/**
 * Shop report service (รายงานร้าน, OPP-19 Phase 1). Reads the data the aggregate
 * needs over the service-role client (RLS deny-all) — bookings and expenses
 * arrive pre-summed from the `shop_insights_rollup` SQL function, so a busy
 * shop never hits PostgREST's 1,000-row cap — then defers ALL metric
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
  /** Calendar years (Gregorian) the month/year picker should offer, newest first. */
  availableYears: number[];
};

export type { ReportRange } from "@/lib/insights/aggregate";

type WindowDate = { dateYmd: string; dayOfWeek: DayOfWeek };

/** One `shop_insights_rollup` booking group (`cur` = current window). */
type RollupBooking = {
  cur: boolean;
  staff_id: string | null;
  service_id: string | null;
  status: string;
  hour: number;
  n: number;
  minutes: number;
  revenue: number | string;
};

/** One `shop_insights_rollup` expense group, summed per category. */
type RollupExpense = {
  cur: boolean;
  category: string | null;
  amount: number | string;
  n: number;
};

/** Booking statuses the analytics model understands; others are skipped. */
const VALID_BOOKING_STATUSES = new Set<string>([
  "confirmed",
  "cancelled",
  "completed",
]);

/** Postgres `numeric` may arrive as a string — coerce to number. */
function priceFromDb(value: number | string | null): number | null {
  if (value == null) return null;
  const n = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(n) ? n : null;
}

/**
 * Resolve a range selection to its current window dates (oldest→newest,
 * INCLUDING today) so the report reconciles with the overview's live "ยอดวันนี้"
 * figure. All clock reads happen here; the pure aggregate stays clock-free.
 *
 * - presets 7/30/90 → rolling windows ending today.
 * - preset "month"/"year" → this month / this year, both to-date.
 * - a specific month/year (from the picker) → that calendar period, capped at
 *   today (so a past period is the full month/year, the current one is to-date).
 */
function resolveWindow(range: ReportRange): WindowDate[] {
  if (range.kind === "month") {
    return getBangkokMonthWindow(range.year, range.month);
  }
  if (range.kind === "year") {
    return getBangkokYearWindow(range.year);
  }
  switch (range.preset) {
    case "7":
      return getBangkokRecentDates(7);
    case "90":
      return getBangkokRecentDates(90);
    case "month":
      return getBangkokMonthToDate();
    case "year":
      return getBangkokYearToDate();
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
  range: ReportRange,
  opts: { filterStaffIds?: string[]; filterServiceIds?: string[] } = {},
): Promise<ShopReport> {
  const { filterStaffIds = [], filterServiceIds = [] } = opts;
  const supabase = getSupabaseAdmin();

  const currentWindow = resolveWindow(range);
  const compareWindow = precedingWindow(currentWindow);

  // Both windows are contiguous date runs; null bounds = empty window.
  const bounds = (w: WindowDate[]) =>
    w.length > 0 ? [w[0].dateYmd, w[w.length - 1].dateYmd] : [null, null];
  const [curStart, curEnd] = bounds(currentWindow);
  const [cmpStart, cmpEnd] = bounds(compareWindow);

  const [
    { data: rollupData, error: rollupError },
    { data: hoursData, error: hoursError },
    { data: staffData, error: staffError },
    { data: servicesData, error: servicesError },
    { data: firstBookingData, error: firstBookingError },
    { data: firstExpenseData, error: firstExpenseError },
  ] = await Promise.all([
    // Bookings (ALL statuses — cancelled feeds the cancellation rate) and
    // expenses for both windows, summed in SQL. One jsonb value, not rows.
    supabase.rpc("shop_insights_rollup", {
      p_shop_id: shopId,
      p_cur_start: curStart,
      p_cur_end: curEnd,
      p_cmp_start: cmpStart,
      p_cmp_end: cmpEnd,
    }),
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
    // Earliest booking / expense dates → the lower bound of the picker's year
    // list, so an owner can scroll back to any year they have data in. Single
    // indexed row each; cheap.
    supabase
      .from("bookings")
      .select("booking_date")
      .eq("shop_id", shopId)
      .order("booking_date", { ascending: true })
      .limit(1),
    supabase
      .from("shop_expenses")
      .select("expense_date")
      .eq("shop_id", shopId)
      .order("expense_date", { ascending: true })
      .limit(1),
  ]);

  // Surface query failures loudly. Without this, the `?? []` fallbacks below
  // would turn any failed query into an all-zero "no data" dashboard — a silent
  // wrong answer the owner can't distinguish from a genuinely quiet period.
  if (rollupError) {
    throw new Error(`insights: rollup query failed: ${rollupError.message}`);
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
  if (firstBookingError) {
    throw new Error(
      `insights: earliest-booking query failed: ${firstBookingError.message}`,
    );
  }
  if (firstExpenseError) {
    throw new Error(
      `insights: earliest-expense query failed: ${firstExpenseError.message}`,
    );
  }

  const rollup = (rollupData ?? {}) as { bookings?: RollupBooking[]; expenses?: RollupExpense[] };

  const currentBookings: InsightsBookingGroup[] = [];
  const compareBookings: InsightsBookingGroup[] = [];
  for (const b of rollup.bookings ?? []) {
    // The SQL already filters to these statuses; re-check before narrowing so
    // an unrecognised one can never be counted as an active booking.
    if (!VALID_BOOKING_STATUSES.has(b.status)) continue;
    (b.cur ? currentBookings : compareBookings).push({
      staffId: b.staff_id ?? null,
      serviceId: b.service_id ?? null,
      status: b.status as InsightsBookingGroup["status"],
      hour: b.hour,
      count: b.n,
      minutes: b.minutes,
      revenue: priceFromDb(b.revenue) ?? 0,
    });
  }

  const currentExpenses: InsightsExpense[] = [];
  const compareExpenses: InsightsExpense[] = [];
  for (const e of rollup.expenses ?? []) {
    const amount = priceFromDb(e.amount);
    if (amount == null) continue;
    (e.cur ? currentExpenses : compareExpenses).push({
      // Per-category sums carry no date; the window is decided by `cur`.
      expenseDate: "",
      category: e.category ?? "",
      amount,
      count: e.n,
    });
  }

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

  // Picker year list: from the earliest year the shop has ANY data in, up to
  // the current Bangkok year (always at least the current year). Newest first.
  const currentYear = Number(getBangkokToday().slice(0, 4));
  const earliestYears = [
    (firstBookingData?.[0]?.booking_date as string | undefined)?.slice(0, 4),
    (firstExpenseData?.[0]?.expense_date as string | undefined)?.slice(0, 4),
  ]
    .map((y) => (y ? Number(y) : null))
    .filter((y): y is number => y != null && Number.isFinite(y));
  const minYear = earliestYears.length > 0 ? Math.min(...earliestYears) : currentYear;
  const availableYears: number[] = [];
  for (let y = currentYear; y >= Math.min(minYear, currentYear); y -= 1) {
    availableYears.push(y);
  }

  return {
    insights,
    deltas,
    staffOptions: staff.map((s) => ({ id: s.id, name: s.name })),
    serviceOptions: services.map((s) => ({ id: s.id, name: s.name })),
    availableYears,
  };
}
