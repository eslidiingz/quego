import "server-only";
import { after } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  DAYS_OF_WEEK,
  generateSlots,
  hhmmToMinutes,
  intervalsOverlap,
  type BookedInterval,
  type BookingContext,
  type BookingService,
  type BusinessHour,
  type DayOfWeek,
} from "@/lib/booking/slot-math";
import {
  dayOfWeekFor,
  getBangkokDateWindow,
  getBangkokNow,
  getBangkokToday,
} from "@/lib/time/bangkok";
import { countActiveStaff } from "@/lib/services/staff";
import type { StaffOption } from "@/lib/booking/slot-math";
import {
  getBookableService,
  listActiveServicesByShop,
} from "@/lib/services/services";
import type { BookingReview } from "@/lib/services/reviews";
import {
  pushNewBookingToShop,
  pushBookingCancelledToShop,
} from "@/lib/services/shop-line";
import {
  pushBookingConfirmationToCustomer,
  pushBookingCancellationToCustomer,
} from "@/lib/services/line-linking";

// Re-export so server callers can import {BookingContext} from this module
// in addition to the pure slot-math file (single source of truth).
export type { BookingContext, BookedInterval } from "@/lib/booking/slot-math";
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

export type BookingStatus = "confirmed" | "cancelled" | "completed";

/** Who initiated a cancellation. Mirrors bookings.cancelled_by (nullable). */
export type CancelledBy = "customer" | "shop";

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
  /**
   * Chosen service id. Omit / null for shops on the implicit single-service
   * fallback (duration taken from the shop's default `service_duration_minutes`).
   */
  serviceId?: string | null;
  /**
   * Customer's preferred staff member. When provided and that staff is free,
   * they are assigned exclusively. If they are busy the booking fails with
   * `slot_taken` — no fallback to another staff member, so the customer must
   * choose a different slot or staff.
   */
  preferredStaffId?: string | null;
};

export type CreateBookingResult =
  | { ok: true; bookingId: string }
  | {
      ok: false;
      code:
        | "shop_unavailable"
        | "service_unavailable"
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
  serviceName: string | null;
  servicePrice: number | null;
  /** Assigned staff member; null for single-queue shops with no staff. */
  staffName: string | null;
  staffRole: string | null;
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
  serviceName: string | null;
  servicePrice: number | null;
  /** Assigned staff member; null for single-queue shops with no staff. */
  staffName: string | null;
  staffRole: string | null;
  status: BookingStatus;
  /** Who cancelled — only meaningful when status === "cancelled"; else null. */
  cancelledBy: CancelledBy | null;
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
  serviceName: string | null;
  servicePrice: number | null;
  /** Assigned staff member; null for single-queue shops with no staff. */
  staffName: string | null;
  staffRole: string | null;
  status: BookingStatus;
  /** Who cancelled — only meaningful when status === "cancelled"; else null. */
  cancelledBy: CancelledBy | null;
  /** The customer's own review of this booking, if any (completed only). */
  review: BookingReview | null;
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

  const [{ data: hoursData }, { data: bookingsData }, activeStaff, activeServices, { data: activeStaffRows, error: staffError }] =
    await Promise.all([
      supabase
        .from("shop_business_hours")
        .select("day_of_week, is_open, open_time, close_time")
        .eq("shop_id", shopId),
      supabase
        .from("bookings")
        .select("booking_date, slot_time, service_duration_minutes, staff_id")
        .eq("shop_id", shopId)
        .gte("booking_date", windowStart)
        .lte("booking_date", windowEnd)
        .in("status", ["confirmed", "completed"]),
      countActiveStaff(shopId),
      listActiveServicesByShop(shopId),
      supabase
        .from("shop_staff")
        .select("id, name, role")
        .eq("shop_id", shopId)
        .eq("is_active", true)
        .eq("provides_service", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
    ]);

  // The staff-picker step depends on this list; a swallowed error here would
  // silently collapse the booking flow back to no-staff mode (the original
  // `nickname`-column bug). Surface it so the failure is loud, not invisible.
  if (staffError) {
    throw new Error(`Failed to load shop staff for booking: ${staffError.message}`);
  }

  // Per-slot capacity = number of active staff (parallel service lines), with
  // a floor of 1 so shops that haven't added staff keep the legacy
  // single-queue behaviour.
  const capacity = Math.max(activeStaff, 1);

  const staffList = (activeStaffRows ?? []) as { id: string; name: string; role: string | null }[];
  const staffOptions: StaffOption[] = staffList.map((s) => ({
    id: s.id,
    name: s.name,
    role: s.role,
  }));

  // Build per-service staff assignment: staff with no rows in shop_staff_services
  // can perform all services (all-capable); staff with rows can only do those.
  let serviceStaffMap: Map<string, string[]> | null = null;
  if (staffList.length > 0 && activeServices.length > 0) {
    const allStaffIds = staffList.map((s) => s.id);
    const { data: assignRows } = await supabase
      .from("shop_staff_services")
      .select("staff_id, service_id")
      .in("staff_id", allStaffIds);

    const staffServiceAssignments = new Map<string, Set<string>>();
    for (const r of assignRows ?? []) {
      const set = staffServiceAssignments.get(r.staff_id as string) ?? new Set<string>();
      set.add(r.service_id as string);
      staffServiceAssignments.set(r.staff_id as string, set);
    }

    serviceStaffMap = new Map<string, string[]>();
    for (const svc of activeServices) {
      const capableIds = allStaffIds.filter((id) => {
        const assigned = staffServiceAssignments.get(id);
        return !assigned || assigned.has(svc.id);
      });
      serviceStaffMap.set(svc.id, capableIds);
    }
  }

  // A shop is bookable only once it has at least one active service. Shops with
  // an empty catalogue return `services: []`; the booking surfaces render a
  // "not open for booking yet" state instead of a form, and `createBooking`
  // rejects any submission that lacks a real service id.
  const services: BookingService[] = activeServices.map((s) => ({
    id: s.id,
    name: s.name,
    durationMinutes: s.durationMinutes,
    price: s.price,
    staffIds: serviceStaffMap ? (serviceStaffMap.get(s.id) ?? []) : null,
  }));

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

  // Project each active booking onto an overlap interval. The picker decides
  // availability per *selected service* (durations differ) by counting how
  // many parallel lines a candidate interval overlaps — see `evaluateSlots`.
  const bookedIntervals: BookedInterval[] = (bookingsData ?? []).map((b) => ({
    date: b.booking_date as string,
    startMin: hhmmToMinutes((b.slot_time as string).slice(0, 5)),
    durationMin: b.service_duration_minutes as number,
    staffId: (b.staff_id as string | null) ?? null,
  }));

  const now = getBangkokNow();
  return {
    shop: {
      id: shop.id,
      name: shop.name,
      serviceDurationMinutes: shop.service_duration_minutes,
    },
    services,
    capacity,
    bookedIntervals,
    hours,
    windowStart,
    windowEnd,
    nowDate: getBangkokToday(),
    nowTimeHHMM: now.timeHHMM,
    staff: staffOptions,
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
    .select("id, status, name")
    .eq("id", input.shopId)
    .maybeSingle();

  if (!shopData || shopData.status !== "approved") {
    return {
      ok: false,
      code: "shop_unavailable",
      message: "ร้านนี้ยังไม่พร้อมรับการจอง",
    };
  }

  // Resolve the chosen service. A provided serviceId must be an active service
  // of THIS shop (ownership + active checked in getBookableService). Its
  // absence means the implicit single-service fallback (shop default duration).
  // Duration drives slot generation; name + price are snapshotted onto the row.
  const serviceId = input.serviceId?.trim() || null;
  let duration: number;
  let serviceName: string | null;
  let servicePrice: number | null;
  if (serviceId) {
    const service = await getBookableService(input.shopId, serviceId);
    if (!service) {
      return {
        ok: false,
        code: "service_unavailable",
        message: "บริการที่เลือกไม่พร้อมให้บริการแล้ว กรุณาเลือกใหม่",
      };
    }
    duration = service.durationMinutes;
    serviceName = service.name;
    servicePrice = service.price;
  } else {
    // No service selected — a shop with an empty catalogue is not bookable.
    return {
      ok: false,
      code: "service_unavailable",
      message: "ร้านนี้ยังไม่เปิดให้จอง — ยังไม่มีบริการให้เลือก",
    };
  }

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
    service_id: serviceId,
    service_name: serviceName,
    service_price: servicePrice,
  };

  const slotTaken: CreateBookingResult = {
    ok: false,
    code: "slot_taken",
    message: "ช่วงเวลานี้ถูกจองโดยลูกค้าอีกคนแล้ว กรุณาเลือกใหม่",
  };

  // Notify the shop AND (if they have LINE connected) the customer. Scheduled
  // with next/server `after` so the LINE round-trips run AFTER the response is
  // flushed — off the booking's latency path — and fail-silent inside each
  // service so they can never fail the booking. The customer push is keyed by
  // phone (the booking identity key) and is a no-op for anonymous bookings.
  // Shared by both insert paths below.
  const scheduleLineNotices = () => {
    after(() =>
      pushNewBookingToShop(input.shopId, {
        customerName: name,
        serviceName,
        bookingDate: input.date,
        slotTime: input.slotTime,
      }),
    );
    if (phoneProvided) {
      after(() =>
        pushBookingConfirmationToCustomer(phone, {
          shopName: shopData.name as string,
          serviceName,
          bookingDate: input.date,
          slotTime: input.slotTime,
        }),
      );
    }
  };

  // The booking occupies [start, start+duration). With variable per-service
  // durations a clash is an interval OVERLAP (not an exact slot_time match),
  // so the DB backstop is a GiST exclusion constraint — a conflicting insert
  // raises SQLSTATE 23P01 (exclusion_violation). We treat that (and 23505,
  // just in case) as "slot taken".
  const isConflict = (code: string | undefined) =>
    code === "23P01" || code === "23505";
  const startMin = hhmmToMinutes(input.slotTime);

  // Capacity model: each active staff member is a parallel service line, so a
  // slot can hold one active booking PER active staff. Shops with no staff
  // fall back to the legacy single-queue path (staff_id = null), guarded by
  // the `bookings_no_overlap_noassign` exclusion constraint.
  const activeStaff = await countActiveStaff(input.shopId);

  if (activeStaff === 0) {
    const { data: inserted, error: insertError } = await supabase
      .from("bookings")
      .insert({ ...baseRow, staff_id: null })
      .select("id")
      .single();

    if (insertError) {
      if (isConflict(insertError.code)) return slotTaken;
      // Log the real DB detail server-side; return a generic message so we
      // don't leak schema/constraint names to the client.
      console.error("createBooking insert error (no-staff path):", insertError);
      return { ok: false, code: "unknown", message: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง" };
    }
    const bookingId = inserted!.id as string;
    scheduleLineNotices();
    return { ok: true, bookingId };
  }

  // Staffed path: find an active staff member whose existing bookings don't
  // OVERLAP this interval, then assign them. The per-staff exclusion
  // constraint (`bookings_no_overlap_staff`) is the race backstop — if two
  // requests pick the same free staff, one gets 23P01 and we try the next.
  const { data: staffRows } = await supabase
    .from("shop_staff")
    .select("id")
    .eq("shop_id", input.shopId)
    .eq("is_active", true)
    .eq("provides_service", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  const allActiveIds = (staffRows ?? []).map((r) => r.id as string);

  // Filter by service capability: staff with no assignments can do all
  // services; staff with assignments can only do their assigned services.
  let candidateIds = allActiveIds;
  if (serviceId && allActiveIds.length > 0) {
    const { data: assignRows } = await supabase
      .from("shop_staff_services")
      .select("staff_id, service_id")
      .in("staff_id", allActiveIds);

    const staffServiceMap = new Map<string, Set<string>>();
    for (const r of assignRows ?? []) {
      const set = staffServiceMap.get(r.staff_id as string) ?? new Set<string>();
      set.add(r.service_id as string);
      staffServiceMap.set(r.staff_id as string, set);
    }
    candidateIds = allActiveIds.filter((id) => {
      const assigned = staffServiceMap.get(id);
      return !assigned || assigned.has(serviceId);
    });
  }

  // Respect customer's preferred staff: only use them (if capable).
  const preferredId = input.preferredStaffId?.trim() || null;
  if (preferredId) {
    candidateIds = candidateIds.includes(preferredId) ? [preferredId] : candidateIds;
  }

  const { data: bookedRows } = await supabase
    .from("bookings")
    .select("staff_id, slot_time, service_duration_minutes")
    .eq("shop_id", input.shopId)
    .eq("booking_date", input.date)
    .in("status", ["confirmed", "completed"])
    .not("staff_id", "is", null);

  const busyStaff = new Set<string>();
  for (const r of bookedRows ?? []) {
    const ivStart = hhmmToMinutes((r.slot_time as string).slice(0, 5));
    if (
      intervalsOverlap(
        startMin,
        duration,
        ivStart,
        r.service_duration_minutes as number,
      )
    ) {
      busyStaff.add(r.staff_id as string);
    }
  }
  const freeStaffIds = candidateIds.filter((id) => !busyStaff.has(id));

  if (freeStaffIds.length === 0) return slotTaken;

  for (const staffId of freeStaffIds) {
    const { data: inserted, error: insertError } = await supabase
      .from("bookings")
      .insert({ ...baseRow, staff_id: staffId })
      .select("id")
      .single();

    if (!insertError) {
      const bookingId = inserted!.id as string;
      scheduleLineNotices();
      return { ok: true, bookingId };
    }
    // 23P01 = this staff was just taken by a concurrent booking; try the next
    // free one. Any other error is fatal.
    if (!isConflict(insertError.code)) {
      // Log the real DB detail server-side; return a generic message so we
      // don't leak schema/constraint names to the client.
      console.error("createBooking insert error (staffed path):", insertError);
      return { ok: false, code: "unknown", message: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง" };
    }
  }

  // Every free candidate lost a race — the slot filled up under us.
  return slotTaken;
}

// ----- Read: confirmation view --------------------------------------------

/** Postgres `numeric` arrives over the wire as a string — coerce to number. */
function priceFromDb(value: number | string | null): number | null {
  if (value == null) return null;
  const n = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(n) ? n : null;
}

type BookingJoinRow = {
  id: string;
  shop_id: string;
  customer_name: string;
  customer_phone: string | null;
  booking_date: string;
  slot_time: string;
  service_duration_minutes: number;
  service_name: string | null;
  service_price: number | string | null;
  status: BookingStatus;
  created_at: string;
  shops: {
    name: string;
    address: string | null;
    contact_phone: string | null;
  } | null;
  shop_staff: {
    name: string;
    role: string | null;
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
        service_name, service_price,
        status, created_at,
        shops ( name, address, contact_phone ),
        shop_staff ( name, role )
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
    serviceName: row.service_name,
    servicePrice: priceFromDb(row.service_price),
    staffName: row.shop_staff?.name ?? null,
    staffRole: row.shop_staff?.role ?? null,
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
  service_name: string | null;
  service_price: number | string | null;
  status: BookingStatus;
  cancelled_by: CancelledBy | null;
  created_at: string;
  shop_staff: {
    name: string;
    role: string | null;
  } | null;
};

// Status priority for the live "today" queue: still-actionable bookings
// (รอรับบริการ / confirmed) rise to the top, then cancelled, with เสร็จสิ้น
// (completed) sunk to the very bottom. cancelled only reaches this sort via the
// dashboard (includeCancelled), which re-sorts in-page anyway, and is excluded
// from the /shop/bookings list entirely.
const TODAY_STATUS_RANK: Record<BookingStatus, number> = {
  confirmed: 0,
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
    serviceName: r.service_name,
    servicePrice: priceFromDb(r.service_price),
    staffName: r.shop_staff?.name ?? null,
    staffRole: r.shop_staff?.role ?? null,
    status: r.status,
    cancelledBy: r.cancelled_by,
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
       slot_time, service_duration_minutes, service_name, service_price,
       status, cancelled_by, created_at,
       shop_staff ( name, role )`,
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
  const rows = (data as unknown as BookingRowDb[]).map(mapRow);

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
    console.error("updateBookingStatus error:", error);
    return { ok: false, code: "unknown", message: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง" };
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
 * be cancelled; completed / already-cancelled return not_found.
 */
export async function cancelOwnBooking(
  bookingId: string,
  customerPhone: string,
): Promise<UpdateBookingStatusResult> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("bookings")
    .update({ status: "cancelled", cancelled_by: "customer" })
    .eq("id", bookingId)
    .eq("customer_phone", customerPhone)
    .eq("status", "confirmed")
    .select("shop_id, customer_name, service_name, booking_date, slot_time")
    .maybeSingle();

  if (error) {
    console.error("cancelOwnBooking error:", error);
    return { ok: false, code: "unknown", message: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง" };
  }
  if (!data) {
    return {
      ok: false,
      code: "not_found",
      message: "ไม่พบการจองนี้ หรือสถานะไม่อนุญาตให้ยกเลิก",
    };
  }

  // Tell the shop (if LINE-connected) that the customer cancelled. Scheduled
  // off the response path with `after` and fail-silent inside the service, so
  // a notification can never fail or slow the cancel. The shop only ever
  // receives cancel notices for customer-initiated cancels, so the source is
  // implicit in the recipient — no "ยกเลิกโดย…" line needed.
  const cancelled = data as {
    shop_id: string;
    customer_name: string;
    service_name: string | null;
    booking_date: string;
    slot_time: string;
  };
  after(() =>
    pushBookingCancelledToShop(cancelled.shop_id, {
      customerName: cancelled.customer_name,
      serviceName: cancelled.service_name,
      bookingDate: cancelled.booking_date,
      slotTime: cancelled.slot_time.slice(0, 5),
    }),
  );

  return { ok: true };
}

/**
 * Shop-initiated cancel. Mirrors `cancelOwnBooking` but keyed by `shopId`
 * (which MUST come from the caller's verified session) instead of
 * `customer_phone`, so a shop can only cancel its own bookings. Only
 * confirmed bookings can be cancelled; completed / already-cancelled
 * return not_found.
 */
export async function cancelBookingByShop(
  bookingId: string,
  shopId: string,
): Promise<UpdateBookingStatusResult> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("bookings")
    .update({ status: "cancelled", cancelled_by: "shop" })
    .eq("id", bookingId)
    .eq("shop_id", shopId)
    .eq("status", "confirmed")
    .select("customer_phone, service_name, booking_date, slot_time")
    .maybeSingle();

  if (error) {
    console.error("cancelBookingByShop error:", error);
    return { ok: false, code: "unknown", message: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง" };
  }
  if (!data) {
    return {
      ok: false,
      code: "not_found",
      message: "ไม่พบการจองนี้ หรือสถานะไม่อนุญาตให้ยกเลิก",
    };
  }

  // Tell the customer (if LINE-connected) that the shop cancelled. Keyed by
  // phone (the booking identity key), so anonymous bookings are a no-op.
  // Scheduled off the response path with `after`, fail-silent inside the
  // service. The shop name is resolved inside the push by `shopId` (not embedded
  // on the UPDATE…RETURNING above), so an empty join can't leak a blank shop
  // name. The customer only ever receives cancel notices for shop-initiated
  // cancels, so the source is implicit in the recipient.
  const cancelled = data as {
    customer_phone: string | null;
    service_name: string | null;
    booking_date: string;
    slot_time: string;
  };
  const customerPhone = cancelled.customer_phone;
  if (customerPhone) {
    after(() =>
      pushBookingCancellationToCustomer(customerPhone, shopId, {
        serviceName: cancelled.service_name,
        bookingDate: cancelled.booking_date,
        slotTime: cancelled.slot_time.slice(0, 5),
      }),
    );
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

export type CancellationAlert = {
  id: string;
  customerName: string;
  slotTime: string; // HH:MM
  bookingDate: string; // YYYY-MM-DD
  cancelledAt: string; // UTC ISO — when the customer cancelled (= updated_at)
};

/**
 * List bookings for one shop that a CUSTOMER cancelled strictly after
 * `sinceIso`. Backs the cancellation half of the shop's live notifier, polled
 * on the SAME cursor as `listNewBookingsForShop` so both event kinds advance
 * against one server clock.
 *
 * The cursor is `updated_at`: the `bookings_set_updated_at` BEFORE-UPDATE
 * trigger stamps it to `now()` on every UPDATE, so for a cancelled row it is the
 * cancel time — and 'cancelled' is terminal, so the row is never touched again
 * (no later bump can resurface a stale notice). Only `cancelled_by = 'customer'`
 * counts: a shop cancelling its own booking must not ping itself (it pings the
 * customer instead). Capped at 20 like its sibling to bound a pathological burst.
 */
export async function listNewCancellationsForShop(
  shopId: string,
  sinceIso: string,
): Promise<CancellationAlert[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("bookings")
    .select("id, customer_name, booking_date, slot_time, updated_at")
    .eq("shop_id", shopId)
    .eq("status", "cancelled")
    .eq("cancelled_by", "customer")
    .gt("updated_at", sinceIso)
    .order("updated_at", { ascending: true })
    .limit(20);

  if (error || !data) return [];
  return (
    data as {
      id: string;
      customer_name: string;
      booking_date: string;
      slot_time: string;
      updated_at: string;
    }[]
  ).map((r) => ({
    id: r.id,
    customerName: r.customer_name,
    slotTime: r.slot_time.slice(0, 5),
    bookingDate: r.booking_date,
    cancelledAt: r.updated_at,
  }));
}

// ----- Read: customer "my queue" view ------------------------------------

type CustomerBookingRow = {
  id: string;
  shop_id: string;
  booking_date: string;
  slot_time: string;
  service_duration_minutes: number;
  service_name: string | null;
  service_price: number | string | null;
  status: BookingStatus;
  cancelled_by: CancelledBy | null;
  shops: { name: string; address: string | null } | null;
  shop_staff: { name: string; role: string | null } | null;
  // reviews embeds the booking's review. Because `reviews.booking_id` is UNIQUE,
  // PostgREST infers a ONE-TO-ONE relationship and returns a single object (or
  // null) — NOT an array. We type it as object-or-array and normalise on read so
  // the mapping is robust either way. Reviews are final once submitted, so we
  // only need the display columns — no created_at/updated_at edit-state probe.
  reviews: EmbeddedReviewRow | EmbeddedReviewRow[] | null;
};

/** The review columns embedded into a booking row (see `CustomerBookingRow`). */
type EmbeddedReviewRow = {
  id: string;
  rating: number;
  comment: string | null;
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
  const nowHHMM = getBangkokNow().timeHHMM;

  const { data, error } = await supabase
    .from("bookings")
    .select(
      `id, shop_id, booking_date, slot_time, service_duration_minutes,
       service_name, service_price, status, cancelled_by,
       shops ( name, address ),
       shop_staff ( name, role ),
       reviews ( id, rating, comment )`,
    )
    .eq("customer_phone", phone)
    .order("booking_date", { ascending: false })
    .order("slot_time", { ascending: false });

  if (error || !data) return [];

  const mapped: CustomerBookingItem[] = (data as unknown as CustomerBookingRow[]).map(
    (r) => {
      // PostgREST returns the embed as an object (one-to-one) or, defensively,
      // an array — normalise to the single review row (or null).
      const reviewRow = Array.isArray(r.reviews)
        ? r.reviews[0] ?? null
        : r.reviews;
      return {
        id: r.id,
        shopId: r.shop_id,
        shopName: r.shops?.name ?? "—",
        shopAddress: r.shops?.address ?? null,
        bookingDate: r.booking_date,
        slotTime: r.slot_time.slice(0, 5),
        serviceDurationMinutes: r.service_duration_minutes,
        serviceName: r.service_name,
        servicePrice: priceFromDb(r.service_price),
        staffName: r.shop_staff?.name ?? null,
        staffRole: r.shop_staff?.role ?? null,
        status: r.status,
        cancelledBy: r.cancelled_by,
        review: reviewRow
          ? {
              id: reviewRow.id,
              rating: reviewRow.rating,
              comment: reviewRow.comment,
            }
          : null,
      };
    },
  );

  // Upcoming bookings (whose slot hasn't started yet) first, nearest-time
  // first, then past bookings reverse-chronological. A slot earlier *today*
  // that has already passed counts as past, so the genuinely next booking
  // leads the list — not a slot whose time is already gone. The DB query
  // ordered the whole list reverse-chrono, so reversing the upcoming half
  // yields ascending (nearest) order.
  const upcoming: CustomerBookingItem[] = [];
  const past: CustomerBookingItem[] = [];
  for (const b of mapped) {
    const isFuture =
      b.bookingDate > today ||
      (b.bookingDate === today && b.slotTime >= nowHHMM);
    if (isFuture) upcoming.push(b);
    else past.push(b);
  }
  upcoming.reverse();
  return [...upcoming, ...past];
}

// ----- Read: public queue status for shop detail page ---------------------

export type ShopQueueStatus = {
  /** Confirmed bookings remaining today (slot hasn't started yet). */
  waitingCount: number;
  /**
   * Busiest staff line's remaining service time, in minutes. Staff serve in
   * parallel, so this is the MAX load across staff lines — not the sum across
   * all bookings. Two 30-min bookings on two different staff clear in 30 min,
   * not 60.
   */
  estimatedWaitMinutes: number;
};

/**
 * Returns how many confirmed bookings are still ahead for today and an
 * estimated wait time. Used on the public shop detail page so customers can
 * gauge busyness before deciding to book.
 *
 * "Remaining" = slot_time >= now (slots in the past are already being served
 * or done, so they don't add to the wait).
 *
 * Wait estimate models the shop's parallel capacity: each staff member is an
 * independent service line, so a booking only delays others assigned to the
 * SAME staff member. The estimate is therefore the busiest line's summed
 * service time (a back-to-back-from-now lower bound on when the backlog
 * clears), not the sum of every booking's duration. Legacy single-queue shops
 * (no per-booking staff) share one sequential lane, which falls out naturally
 * since their `staff_id` is null.
 */
export async function getShopPublicQueueStatus(
  shopId: string,
): Promise<ShopQueueStatus> {
  const supabase = getSupabaseAdmin();
  const today = getBangkokToday();
  const now = getBangkokNow();

  const { data } = await supabase
    .from("bookings")
    .select("service_duration_minutes, staff_id")
    .eq("shop_id", shopId)
    .eq("booking_date", today)
    .eq("status", "confirmed")
    .gte("slot_time", now.timeHHMM);

  if (!data || data.length === 0) return { waitingCount: 0, estimatedWaitMinutes: 0 };

  const rows = data as {
    service_duration_minutes: number | null;
    staff_id: string | null;
  }[];

  // Accumulate remaining service time per staff line; null staff = the single
  // shared lane of a legacy single-queue shop. The wait is the busiest line.
  const SINGLE_QUEUE_LANE = "__single_queue__";
  const loadByLine = new Map<string, number>();
  for (const b of rows) {
    const line = b.staff_id ?? SINGLE_QUEUE_LANE;
    const duration = b.service_duration_minutes ?? 30;
    loadByLine.set(line, (loadByLine.get(line) ?? 0) + duration);
  }
  const estimatedWaitMinutes = Math.max(...loadByLine.values());

  return { waitingCount: rows.length, estimatedWaitMinutes };
}
