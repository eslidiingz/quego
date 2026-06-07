import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getBangkokPastDates } from "@/lib/time/bangkok";
import {
  DAYS_OF_WEEK,
  type BusinessHour,
  type DayOfWeek,
} from "@/lib/booking/slot-math";
import {
  computeShopInsights,
  type InsightsBooking,
  type InsightsStaff,
  type ShopInsights,
} from "@/lib/insights/aggregate";

/**
 * Shop insights service (OPP-19). Reads the data three aggregate queries need
 * over the service-role client (RLS deny-all), then defers ALL metric math to
 * the pure `computeShopInsights` helper so this module stays a thin I/O shim.
 *
 * SRP: fetch + shape rows. No metric logic, no UI concerns.
 */

export type { ShopInsights } from "@/lib/insights/aggregate";

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
 * Aggregate one shop's bookings over the last `rangeDays` full days (the window
 * ends yesterday — today is partial and would skew fill rate). All reads are
 * scoped by `shopId`, which MUST come from the caller's verified session.
 */
export async function getShopInsights(
  shopId: string,
  rangeDays: number,
): Promise<ShopInsights> {
  const supabase = getSupabaseAdmin();

  const windowDates = getBangkokPastDates(rangeDays);
  const windowStart = windowDates[0].dateYmd;
  const windowEnd = windowDates[windowDates.length - 1].dateYmd;

  const [
    { data: bookingsData, error: bookingsError },
    { data: hoursData, error: hoursError },
    { data: staffData, error: staffError },
  ] = await Promise.all([
    // ALL statuses — cancelled rows are needed for the cancellation rate.
    supabase
      .from("bookings")
      .select(
        "booking_date, slot_time, service_duration_minutes, staff_id, status, service_price",
      )
      .eq("shop_id", shopId)
      .gte("booking_date", windowStart)
      .lte("booking_date", windowEnd),
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
  ]);

  // Surface query failures loudly. Without this, the `?? []` fallbacks below
  // would turn any failed query into an all-zero "no data" dashboard — a silent
  // wrong answer the owner can't distinguish from a genuinely quiet period.
  // Mirrors the throw-convention in getBookingContext (services/bookings.ts).
  if (bookingsError) {
    throw new Error(`insights: bookings query failed: ${bookingsError.message}`);
  }
  if (hoursError) {
    throw new Error(`insights: business hours query failed: ${hoursError.message}`);
  }
  if (staffError) {
    throw new Error(`insights: staff query failed: ${staffError.message}`);
  }

  const bookings: InsightsBooking[] = (bookingsData ?? []).flatMap((b) => {
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
        status: status as InsightsBooking["status"],
        price: priceFromDb(b.service_price as number | string | null),
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

  return computeShopInsights({ rangeDays, windowDates, hours, bookings, staff });
}
