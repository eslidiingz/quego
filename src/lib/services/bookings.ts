import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  DAYS_OF_WEEK,
  generateSlots,
  type BookingContext,
  type BusinessHour,
  type DayOfWeek,
  type TakenSlot,
} from "@/lib/booking/slot-math";
import {
  dayOfWeekFor,
  getBangkokDateWindow,
  getBangkokNow,
  getBangkokToday,
} from "@/lib/time/bangkok";

// Re-export so server callers can import {BookingContext} from this module
// in addition to the pure slot-math file (single source of truth).
export type { BookingContext, TakenSlot } from "@/lib/booking/slot-math";
export { generateSlots } from "@/lib/booking/slot-math";

/**
 * Bookings service. All operations go through the service-role Supabase
 * client (RLS deny-all on the `bookings` table) so authorization decisions
 * are made here rather than at the database layer.
 *
 * SRP: slot derivation + booking creation. Knows about business hours and
 * service duration enough to validate, but does not reach into UI shaping
 * (the page maps these results into Thai-language messages).
 */

// ----- Types --------------------------------------------------------------

export const BOOKING_WINDOW_DAYS = 16;

export type BookingStatus =
  | "confirmed"
  | "cancelled"
  | "completed"
  | "no_show";

export type CreateBookingInput = {
  shopId: string;
  date: string; // YYYY-MM-DD
  slotTime: string; // HH:MM
  customerName: string;
  /**
   * Optional. Customer-facing form enforces it client-side; the shop-side
   * manual booking flow allows it to be omitted (the shop already has the
   * caller's number from the phone call itself).
   */
  customerPhone?: string;
};

export type CreateBookingResult =
  | { ok: true; bookingId: string }
  | {
      ok: false;
      code:
        | "shop_unavailable"
        | "date_closed"
        | "slot_invalid"
        | "slot_past"
        | "slot_taken"
        | "invalid"
        | "unknown";
      message: string;
    };

export type BookingDetails = {
  id: string;
  shopId: string;
  shopName: string;
  shopAddress: string | null;
  shopContactPhone: string | null;
  customerName: string;
  customerPhone: string | null;
  bookingDate: string;
  slotTime: string; // HH:MM
  serviceDurationMinutes: number;
  status: BookingStatus;
  createdAt: string;
};

export type BookingListItem = {
  id: string;
  customerName: string;
  customerPhone: string | null;
  bookingDate: string;
  slotTime: string; // HH:MM
  serviceDurationMinutes: number;
  status: BookingStatus;
  createdAt: string;
};

export type BookingsFilter = "today" | "upcoming" | "past" | "all";

export type BookingsCounts = Record<BookingsFilter, number>;

// ----- Public read: context for the booking form --------------------------

type ShopRow = {
  id: string;
  name: string;
  status: string;
  service_duration_minutes: number;
};

/**
 * Returns the data needed to render the booking page in one shot. Returns
 * `null` if the shop doesn't exist or isn't approved — the page maps that
 * to a 404.
 */
export async function getBookingContext(
  shopId: string,
  windowDays: number = BOOKING_WINDOW_DAYS,
): Promise<BookingContext | null> {
  const supabase = getSupabaseAdmin();

  const { data: shopData, error: shopError } = await supabase
    .from("shops")
    .select("id, name, status, service_duration_minutes")
    .eq("id", shopId)
    .maybeSingle();

  if (shopError || !shopData) return null;
  const shop = shopData as ShopRow;
  if (shop.status !== "approved") return null;

  const window = getBangkokDateWindow(windowDays);
  const windowStart = window[0].dateYmd;
  const windowEnd = window[window.length - 1].dateYmd;

  const [{ data: hoursData }, { data: bookingsData }] = await Promise.all([
    supabase
      .from("shop_business_hours")
      .select("day_of_week, is_open, open_time, close_time")
      .eq("shop_id", shopId),
    supabase
      .from("bookings")
      .select("booking_date, slot_time")
      .eq("shop_id", shopId)
      .gte("booking_date", windowStart)
      .lte("booking_date", windowEnd)
      .in("status", ["confirmed", "completed"]),
  ]);

  const byDay = new Map<DayOfWeek, BusinessHour>();
  for (const h of hoursData ?? []) {
    const day = h.day_of_week as DayOfWeek;
    byDay.set(day, {
      dayOfWeek: day,
      isOpen: h.is_open,
      openTime: h.open_time ? h.open_time.slice(0, 5) : null,
      closeTime: h.close_time ? h.close_time.slice(0, 5) : null,
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

  const takenSlots: TakenSlot[] = (bookingsData ?? []).map((b) => ({
    date: b.booking_date,
    slotTime: (b.slot_time as string).slice(0, 5),
  }));

  const now = getBangkokNow();
  return {
    shop: {
      id: shop.id,
      name: shop.name,
      serviceDurationMinutes: shop.service_duration_minutes,
    },
    hours,
    takenSlots,
    windowStart,
    windowEnd,
    nowDate: getBangkokToday(),
    nowTimeHHMM: now.timeHHMM,
  };
}

// ----- Write: create a booking -------------------------------------------

const PHONE_RE = /^[0-9]{9,10}$/u;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/u;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]0$/u;

/**
 * Create a confirmed booking. Re-validates the slot end-to-end so a stale
 * client (or a tampered request) cannot bypass the rules enforced in the
 * picker UI:
 *
 *   1. Shop exists and is approved
 *   2. The date is within the booking window
 *   3. The shop is open on that day-of-week and the slot fits
 *   4. The slot has not already started (today's past slots)
 *   5. The slot isn't already taken (unique-index protection is the final
 *      backstop for race conditions between two simultaneous clicks)
 */
export async function createBooking(
  input: CreateBookingInput,
): Promise<CreateBookingResult> {
  // Format gate first — everything below assumes well-formed strings.
  const name = input.customerName.trim();
  const phone = (input.customerPhone ?? "").trim();
  const phoneProvided = phone.length > 0;
  if (
    !DATE_RE.test(input.date) ||
    !TIME_RE.test(input.slotTime) ||
    (phoneProvided && !PHONE_RE.test(phone)) ||
    name.length === 0 ||
    name.length > 100
  ) {
    return {
      ok: false,
      code: "invalid",
      message: "ข้อมูลการจองไม่ถูกต้อง",
    };
  }

  const supabase = getSupabaseAdmin();

  const { data: shopData } = await supabase
    .from("shops")
    .select("id, status, service_duration_minutes")
    .eq("id", input.shopId)
    .maybeSingle();

  if (!shopData || shopData.status !== "approved") {
    return {
      ok: false,
      code: "shop_unavailable",
      message: "ร้านนี้ยังไม่พร้อมรับการจอง",
    };
  }
  const duration = shopData.service_duration_minutes as number;

  // Window check — booking_date must be today..today+13.
  const window = getBangkokDateWindow(BOOKING_WINDOW_DAYS);
  const validDates = new Set(window.map((w) => w.dateYmd));
  if (!validDates.has(input.date)) {
    return {
      ok: false,
      code: "date_closed",
      message: "วันที่เลือกอยู่นอกช่วงที่จองได้",
    };
  }

  const dow = dayOfWeekFor(input.date);
  const { data: hoursRow } = await supabase
    .from("shop_business_hours")
    .select("is_open, open_time, close_time")
    .eq("shop_id", input.shopId)
    .eq("day_of_week", dow)
    .maybeSingle();

  if (
    !hoursRow ||
    !hoursRow.is_open ||
    !hoursRow.open_time ||
    !hoursRow.close_time
  ) {
    return {
      ok: false,
      code: "date_closed",
      message: "ร้านปิดในวันที่เลือก",
    };
  }

  const openHHMM = (hoursRow.open_time as string).slice(0, 5);
  const closeHHMM = (hoursRow.close_time as string).slice(0, 5);
  const slots = generateSlots(openHHMM, closeHHMM, duration);
  if (!slots.includes(input.slotTime)) {
    return {
      ok: false,
      code: "slot_invalid",
      message: "ช่วงเวลานี้ไม่อยู่ในรอบให้บริการของร้าน",
    };
  }

  // Past-slot check — only relevant for today.
  const today = getBangkokToday();
  if (input.date === today) {
    const now = getBangkokNow();
    if (input.slotTime <= now.timeHHMM) {
      return {
        ok: false,
        code: "slot_past",
        message: "ช่วงเวลานี้ผ่านไปแล้ว",
      };
    }
  }

  const { data: inserted, error: insertError } = await supabase
    .from("bookings")
    .insert({
      shop_id: input.shopId,
      customer_name: name,
      customer_phone: phoneProvided ? phone : null,
      booking_date: input.date,
      slot_time: input.slotTime,
      service_duration_minutes: duration,
    })
    .select("id")
    .single();

  if (insertError) {
    // 23505 = unique_violation. Our partial unique index fires here when a
    // second booking races against an active one in the same slot.
    if (insertError.code === "23505") {
      return {
        ok: false,
        code: "slot_taken",
        message: "ช่วงเวลานี้ถูกจองโดยลูกค้าอีกคนแล้ว กรุณาเลือกใหม่",
      };
    }
    return {
      ok: false,
      code: "unknown",
      message: insertError.message,
    };
  }

  return { ok: true, bookingId: inserted!.id as string };
}

// ----- Read: confirmation view --------------------------------------------

type BookingJoinRow = {
  id: string;
  shop_id: string;
  customer_name: string;
  customer_phone: string | null;
  booking_date: string;
  slot_time: string;
  service_duration_minutes: number;
  status: BookingStatus;
  created_at: string;
  shops: {
    name: string;
    address: string | null;
    contact_phone: string | null;
  } | null;
};

/**
 * Fetch one booking + the shop fields needed for the confirmation screen.
 * Anyone with the booking UUID can read it — UUID v4 is effectively
 * un-guessable, but we deliberately don't expose any lookup-by-phone
 * endpoint at this layer.
 */
export async function getBookingById(
  bookingId: string,
): Promise<BookingDetails | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("bookings")
    .select(
      `
        id, shop_id, customer_name, customer_phone,
        booking_date, slot_time, service_duration_minutes,
        status, created_at,
        shops ( name, address, contact_phone )
      `,
    )
    .eq("id", bookingId)
    .maybeSingle();

  if (error || !data) return null;
  const row = data as unknown as BookingJoinRow;
  return {
    id: row.id,
    shopId: row.shop_id,
    shopName: row.shops?.name ?? "—",
    shopAddress: row.shops?.address ?? null,
    shopContactPhone: row.shops?.contact_phone ?? null,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    bookingDate: row.booking_date,
    slotTime: row.slot_time.slice(0, 5),
    serviceDurationMinutes: row.service_duration_minutes,
    status: row.status,
    createdAt: row.created_at,
  };
}

// ----- Read: shop-owner views --------------------------------------------

type BookingRowDb = {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  booking_date: string;
  slot_time: string;
  service_duration_minutes: number;
  status: BookingStatus;
  created_at: string;
};

function mapRow(r: BookingRowDb): BookingListItem {
  return {
    id: r.id,
    customerName: r.customer_name,
    customerPhone: r.customer_phone,
    bookingDate: r.booking_date,
    slotTime: r.slot_time.slice(0, 5),
    serviceDurationMinutes: r.service_duration_minutes,
    status: r.status,
    createdAt: r.created_at,
  };
}

/**
 * List bookings for one shop, filtered relative to today (Bangkok).
 *
 * Sort direction follows the natural reading order for each filter:
 *   - today / upcoming → chronological (next service first)
 *   - past / all       → reverse chronological (most recent first)
 *
 * Cancelled bookings are intentionally included — the shop owner sees the
 * full history with a status chip rather than a silent drop.
 */
export async function listBookingsByShop(
  shopId: string,
  filter: BookingsFilter,
): Promise<BookingListItem[]> {
  const supabase = getSupabaseAdmin();
  const today = getBangkokToday();

  let query = supabase
    .from("bookings")
    .select(
      `id, customer_name, customer_phone, booking_date,
       slot_time, service_duration_minutes, status, created_at`,
    )
    .eq("shop_id", shopId);

  switch (filter) {
    case "today":
      query = query
        .eq("booking_date", today)
        .order("slot_time", { ascending: true });
      break;
    case "upcoming":
      query = query
        .gt("booking_date", today)
        .order("booking_date", { ascending: true })
        .order("slot_time", { ascending: true });
      break;
    case "past":
      query = query
        .lt("booking_date", today)
        .order("booking_date", { ascending: false })
        .order("slot_time", { ascending: false });
      break;
    case "all":
      query = query
        .order("booking_date", { ascending: false })
        .order("slot_time", { ascending: false });
      break;
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return (data as BookingRowDb[]).map(mapRow);
}

// ----- Write: status transitions ----------------------------------------

export type UpdateBookingStatusResult =
  | { ok: true }
  | {
      ok: false;
      code: "not_found" | "unknown";
      message: string;
    };

/**
 * Transition a booking to a new status. The `shopId` parameter is the
 * authoritative ownership check — it MUST come from the caller's verified
 * session, never from request input, so a shop owner can't update another
 * shop's bookings even by guessing a booking UUID.
 *
 * The update happens in one statement with a compound `eq` filter on both
 * `id` and `shop_id`; if either fails to match, Supabase returns zero rows
 * and we surface `not_found`.
 */
export async function updateBookingStatus(
  bookingId: string,
  shopId: string,
  newStatus: BookingStatus,
): Promise<UpdateBookingStatusResult> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("bookings")
    .update({ status: newStatus })
    .eq("id", bookingId)
    .eq("shop_id", shopId)
    .select("id")
    .maybeSingle();

  if (error) {
    return { ok: false, code: "unknown", message: error.message };
  }
  if (!data) {
    return { ok: false, code: "not_found", message: "ไม่พบรายการจองนี้" };
  }
  return { ok: true };
}

/**
 * Returns the count for each filter in a single round-trip. The query
 * fetches just `booking_date` for every booking and buckets client-side —
 * cheap because there's no realistic universe in which a single shop has
 * enough bookings to make this scan painful.
 */
export async function countBookingsByShop(
  shopId: string,
): Promise<BookingsCounts> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("bookings")
    .select("booking_date")
    .eq("shop_id", shopId);

  const counts: BookingsCounts = { today: 0, upcoming: 0, past: 0, all: 0 };
  if (error || !data) return counts;

  const today = getBangkokToday();
  for (const row of data as { booking_date: string }[]) {
    counts.all += 1;
    if (row.booking_date === today) counts.today += 1;
    else if (row.booking_date > today) counts.upcoming += 1;
    else counts.past += 1;
  }
  return counts;
}
