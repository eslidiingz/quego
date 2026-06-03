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
import { countActiveStaff } from "@/lib/services/staff";

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

export type CustomerBookingItem = {
  id: string;
  shopId: string;
  shopName: string;
  shopAddress: string | null;
  bookingDate: string;
  slotTime: string; // HH:MM
  serviceDurationMinutes: number;
  status: BookingStatus;
};

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

  const [{ data: hoursData }, { data: bookingsData }, activeStaff] =
    await Promise.all([
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
      countActiveStaff(shopId),
    ]);

  // Per-slot capacity = number of active staff (parallel service lines), with
  // a floor of 1 so shops that haven't added staff keep the legacy
  // single-queue behaviour.
  const capacity = Math.max(activeStaff, 1);

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

  // A slot is unavailable to the picker only when it is FULL — i.e. the number
  // of active bookings in it has reached capacity. We count per (date, slot)
  // and emit just the full ones, so the existing picker logic ("slot present
  // in takenSlots ⇒ disabled") keeps working unchanged while respecting the
  // multi-staff capacity.
  const slotCounts = new Map<string, number>();
  for (const b of bookingsData ?? []) {
    const key = `${b.booking_date}T${(b.slot_time as string).slice(0, 5)}`;
    slotCounts.set(key, (slotCounts.get(key) ?? 0) + 1);
  }
  const takenSlots: TakenSlot[] = [];
  for (const [key, count] of slotCounts) {
    if (count >= capacity) {
      const [date, slotTime] = key.split("T");
      takenSlots.push({ date, slotTime });
    }
  }

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

  const baseRow = {
    shop_id: input.shopId,
    customer_name: name,
    customer_phone: phoneProvided ? phone : null,
    booking_date: input.date,
    slot_time: input.slotTime,
    service_duration_minutes: duration,
  };

  const slotTaken: CreateBookingResult = {
    ok: false,
    code: "slot_taken",
    message: "ช่วงเวลานี้ถูกจองโดยลูกค้าอีกคนแล้ว กรุณาเลือกใหม่",
  };

  // Capacity model: each active staff member is a parallel service line, so a
  // slot can hold one active booking PER active staff. Shops with no staff
  // fall back to the legacy single-queue path (staff_id = null), guarded by
  // the `bookings_unique_active_slot_noassign` partial unique index.
  const activeStaff = await countActiveStaff(input.shopId);

  if (activeStaff === 0) {
    const { data: inserted, error: insertError } = await supabase
      .from("bookings")
      .insert({ ...baseRow, staff_id: null })
      .select("id")
      .single();

    if (insertError) {
      // 23505 = unique_violation: another booking already holds this slot.
      if (insertError.code === "23505") return slotTaken;
      return { ok: false, code: "unknown", message: insertError.message };
    }
    return { ok: true, bookingId: inserted!.id as string };
  }

  // Staffed path: find an active staff member with no active booking in this
  // exact slot, then assign them. The per-staff unique index
  // (`bookings_unique_active_slot_staff`) is the race backstop — if two
  // requests pick the same free staff, one gets 23505 and we try the next.
  const { data: staffRows } = await supabase
    .from("shop_staff")
    .select("id")
    .eq("shop_id", input.shopId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  const { data: bookedRows } = await supabase
    .from("bookings")
    .select("staff_id")
    .eq("shop_id", input.shopId)
    .eq("booking_date", input.date)
    .eq("slot_time", input.slotTime)
    .in("status", ["confirmed", "completed"])
    .not("staff_id", "is", null);

  const bookedIds = new Set(
    (bookedRows ?? []).map((r) => r.staff_id as string),
  );
  const freeStaffIds = (staffRows ?? [])
    .map((r) => r.id as string)
    .filter((id) => !bookedIds.has(id));

  if (freeStaffIds.length === 0) return slotTaken;

  for (const staffId of freeStaffIds) {
    const { data: inserted, error: insertError } = await supabase
      .from("bookings")
      .insert({ ...baseRow, staff_id: staffId })
      .select("id")
      .single();

    if (!insertError) return { ok: true, bookingId: inserted!.id as string };
    // 23505 = this staff was just taken by a concurrent booking; try the next
    // free one. Any other error is fatal.
    if (insertError.code !== "23505") {
      return { ok: false, code: "unknown", message: insertError.message };
    }
  }

  // Every free candidate lost a race — the slot filled up under us.
  return slotTaken;
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

// Status priority for the live "today" queue: still-actionable bookings
// (รอรับบริการ / confirmed) rise to the top, then no-shows, with เสร็จสิ้น
// (completed) sunk to the very bottom. cancelled shares no-show's rank — it
// only reaches this sort via the dashboard (includeCancelled), which re-sorts
// in-page anyway, and is excluded from the /shop/bookings list entirely.
const TODAY_STATUS_RANK: Record<BookingStatus, number> = {
  confirmed: 0,
  no_show: 1,
  cancelled: 1,
  completed: 2,
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
 *   - today            → by status first (รอรับบริการ at the top ordered by
 *                        nearest slot time, เสร็จสิ้น sunk to the bottom),
 *                        chronological within each status group
 *   - upcoming         → chronological (next service first)
 *   - past / all       → reverse chronological (most recent first)
 *
 * `includeCancelled` controls whether cancelled bookings appear:
 *   - the shop dashboard's today-overview keeps them (default true) so the
 *     "ยกเลิก" status tile has something to count;
 *   - the /shop/bookings management list passes false so a retracted booking
 *     drops out of the list entirely, staying consistent with the tab badges
 *     (`countBookingsByShop` also excludes cancelled).
 */
export async function listBookingsByShop(
  shopId: string,
  filter: BookingsFilter,
  { includeCancelled = true }: { includeCancelled?: boolean } = {},
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

  if (!includeCancelled) {
    query = query.neq("status", "cancelled");
  }

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
  const rows = (data as BookingRowDb[]).map(mapRow);

  // Today's view is the live working queue: lift รอรับบริการ to the top and
  // sink เสร็จสิ้น to the bottom. The query already ordered by slot_time asc,
  // and Array.prototype.sort is stable, so "nearest time first" is preserved
  // within each status group. Other filters keep their query ordering.
  if (filter === "today") {
    rows.sort(
      (a, b) => TODAY_STATUS_RANK[a.status] - TODAY_STATUS_RANK[b.status],
    );
  }

  return rows;
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
 * Customer-initiated cancel. Uses `customer_phone` as the ownership key
 * (compound `eq(id) + eq(customer_phone)`) so a logged-in customer can
 * only cancel bookings tied to their own phone — including ones made
 * anonymously or by a shop on their behalf. Only confirmed bookings can
 * be cancelled; completed / no_show / already-cancelled return not_found.
 */
export async function cancelOwnBooking(
  bookingId: string,
  customerPhone: string,
): Promise<UpdateBookingStatusResult> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("id", bookingId)
    .eq("customer_phone", customerPhone)
    .eq("status", "confirmed")
    .select("id")
    .maybeSingle();

  if (error) {
    return { ok: false, code: "unknown", message: error.message };
  }
  if (!data) {
    return {
      ok: false,
      code: "not_found",
      message: "ไม่พบการจองนี้ หรือสถานะไม่อนุญาตให้ยกเลิก",
    };
  }
  return { ok: true };
}

/**
 * Shop-initiated cancel. Mirrors `cancelOwnBooking` but keyed by `shopId`
 * (which MUST come from the caller's verified session) instead of
 * `customer_phone`, so a shop can only cancel its own bookings. Only
 * confirmed bookings can be cancelled; completed / no_show / already-cancelled
 * return not_found.
 */
export async function cancelBookingByShop(
  bookingId: string,
  shopId: string,
): Promise<UpdateBookingStatusResult> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("id", bookingId)
    .eq("shop_id", shopId)
    .eq("status", "confirmed")
    .select("id")
    .maybeSingle();

  if (error) {
    return { ok: false, code: "unknown", message: error.message };
  }
  if (!data) {
    return {
      ok: false,
      code: "not_found",
      message: "ไม่พบการจองนี้ หรือสถานะไม่อนุญาตให้ยกเลิก",
    };
  }
  return { ok: true };
}

/**
 * Returns the count for each filter in a single round-trip. The query
 * fetches just `booking_date` for every booking and buckets client-side —
 * cheap because there's no realistic universe in which a single shop has
 * enough bookings to make this scan painful.
 *
 * Cancelled bookings are excluded: the tab badges report how many *active*
 * bookings each bucket holds, so a retracted booking must not inflate the
 * number shown to the shop. (Cancelled rows still appear in the list itself
 * via `listBookingsByShop` — they're history, just not counted.)
 */
export async function countBookingsByShop(
  shopId: string,
): Promise<BookingsCounts> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("bookings")
    .select("booking_date")
    .eq("shop_id", shopId)
    .neq("status", "cancelled");

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

// ----- Read: shop new-booking notifications ------------------------------

export type NewBookingAlert = {
  id: string;
  customerName: string;
  slotTime: string; // HH:MM
  bookingDate: string; // YYYY-MM-DD
  createdAt: string; // UTC ISO
};

/**
 * List confirmed bookings for one shop created strictly after `sinceIso`.
 * Backs the shop's live "new booking" notifier, which polls this on a short
 * interval with a server-supplied cursor.
 *
 * SRP: a thin "what arrived since T?" read — no UI shaping, no side effects.
 * `.gt` (strict) pairs with the caller advancing its cursor to the server's
 * current time each tick, so a row is never emitted twice on the boundary.
 * Capped at 20 to bound a pathological burst; only `confirmed` bookings
 * count (a same-tick cancel shouldn't ping the shop).
 */
export async function listNewBookingsForShop(
  shopId: string,
  sinceIso: string,
): Promise<NewBookingAlert[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("bookings")
    .select("id, customer_name, booking_date, slot_time, created_at")
    .eq("shop_id", shopId)
    .eq("status", "confirmed")
    .gt("created_at", sinceIso)
    .order("created_at", { ascending: true })
    .limit(20);

  if (error || !data) return [];
  return (
    data as {
      id: string;
      customer_name: string;
      booking_date: string;
      slot_time: string;
      created_at: string;
    }[]
  ).map((r) => ({
    id: r.id,
    customerName: r.customer_name,
    slotTime: r.slot_time.slice(0, 5),
    bookingDate: r.booking_date,
    createdAt: r.created_at,
  }));
}

// ----- Read: customer "my queue" view ------------------------------------

type CustomerBookingRow = {
  id: string;
  shop_id: string;
  booking_date: string;
  slot_time: string;
  service_duration_minutes: number;
  status: BookingStatus;
  shops: { name: string; address: string | null } | null;
};

/**
 * List all bookings tied to a customer's phone number, ordered with
 * upcoming-first then past. Includes shop name + address for context so
 * the customer's "คิวของฉัน" page can render without a second round-trip.
 *
 * Phone is treated as the customer identity key here — bookings made
 * anonymously (or by a shop on the customer's behalf) under the same
 * phone surface in the same list.
 */
export async function listBookingsByCustomerPhone(
  phone: string,
): Promise<CustomerBookingItem[]> {
  const supabase = getSupabaseAdmin();
  const today = getBangkokToday();

  const { data, error } = await supabase
    .from("bookings")
    .select(
      `id, shop_id, booking_date, slot_time, service_duration_minutes, status,
       shops ( name, address )`,
    )
    .eq("customer_phone", phone)
    .order("booking_date", { ascending: false })
    .order("slot_time", { ascending: false });

  if (error || !data) return [];

  const mapped: CustomerBookingItem[] = (data as unknown as CustomerBookingRow[]).map(
    (r) => ({
      id: r.id,
      shopId: r.shop_id,
      shopName: r.shops?.name ?? "—",
      shopAddress: r.shops?.address ?? null,
      bookingDate: r.booking_date,
      slotTime: r.slot_time.slice(0, 5),
      serviceDurationMinutes: r.service_duration_minutes,
      status: r.status,
    }),
  );

  // Upcoming bookings (today or later) first in chronological order, then
  // past bookings reverse-chronological. The DB query above ordered the
  // whole list reverse-chrono — we split + reverse the upcoming half.
  const upcoming: CustomerBookingItem[] = [];
  const past: CustomerBookingItem[] = [];
  for (const b of mapped) {
    if (b.bookingDate >= today) upcoming.push(b);
    else past.push(b);
  }
  upcoming.reverse();
  return [...upcoming, ...past];
}
