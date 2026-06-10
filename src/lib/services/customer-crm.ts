import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { BookingStatus, CancelledBy } from "@/lib/services/bookings";

/**
 * CRM-lite customer-history read (OPP-14). Aggregates one customer's booking
 * history AT ONE SHOP, keyed by phone (the customer identity key), so a shop
 * sees anonymous, shop-made, and authenticated bookings under one phone.
 *
 * Like every service here, reads go through the service-role client (RLS
 * deny-all). Privacy is enforced in app code: the query is scoped by `shopId`,
 * which MUST come from the caller's verified session — a shop can only ever
 * read its own bookings, never another shop's, even for the same phone.
 *
 * SRP: fetch + shape rows + fold into summary counts. No UI concerns, no
 * persistence — the page maps this into Thai-language UI.
 */

// ----- Types --------------------------------------------------------------

/** One of the customer's bookings at this shop, for the history timeline. */
export type ShopCustomerBooking = {
  id: string;
  customerName: string;
  bookingDate: string; // YYYY-MM-DD
  slotTime: string; // HH:MM
  serviceName: string | null;
  servicePrice: number | null;
  serviceDurationMinutes: number;
  status: BookingStatus;
  /** Who cancelled — only meaningful when status === "cancelled"; else null. */
  cancelledBy: CancelledBy | null;
  staffName: string | null;
  createdAt: string; // UTC ISO
};

export type ShopCustomerHistory = {
  /** The customer's most recent name on record at this shop (unmasked). */
  displayName: string | null;
  totalVisits: number; // completed bookings
  cancelledCount: number;
  upcomingCount: number; // confirmed bookings still on the calendar
  firstVisit: string | null; // earliest booking_date
  lastVisit: string | null; // latest booking_date
  bookings: ShopCustomerBooking[]; // newest-first
};

// ----- Internal row shape -------------------------------------------------

type CrmBookingRow = {
  id: string;
  customer_name: string;
  booking_date: string;
  slot_time: string;
  service_name: string | null;
  service_price: number | string | null;
  service_duration_minutes: number;
  status: BookingStatus;
  cancelled_by: CancelledBy | null;
  created_at: string;
  shop_staff: { name: string } | null;
};

/** Postgres `numeric` arrives over the wire as a string — coerce to number. */
function priceFromDb(value: number | string | null): number | null {
  if (value == null) return null;
  const n = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(n) ? n : null;
}

const EMPTY_HISTORY: ShopCustomerHistory = {
  displayName: null,
  totalVisits: 0,
  cancelledCount: 0,
  upcomingCount: 0,
  firstVisit: null,
  lastVisit: null,
  bookings: [],
};

// ----- Read: one customer's history at this shop --------------------------

/**
 * Read every booking this phone has at `shopId`, newest-first, plus rolled-up
 * counts. `shopId` MUST come from the verified session (the ownership key);
 * the page treats a zero-booking result as a 404 so an arbitrary phone can't be
 * enumerated.
 */
export async function getCustomerHistoryForShop(
  shopId: string,
  phone: string,
): Promise<ShopCustomerHistory> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("bookings")
    .select(
      `id, customer_name, booking_date, slot_time, service_name, service_price,
       service_duration_minutes, status, cancelled_by, created_at,
       shop_staff ( name )`,
    )
    .eq("shop_id", shopId)
    .eq("customer_phone", phone)
    .order("booking_date", { ascending: false })
    .order("slot_time", { ascending: false });

  if (error || !data) {
    if (error) console.error("getCustomerHistoryForShop error:", error);
    return EMPTY_HISTORY;
  }

  const rows = data as unknown as CrmBookingRow[];
  if (rows.length === 0) return EMPTY_HISTORY;

  const bookings: ShopCustomerBooking[] = rows.map((r) => ({
    id: r.id,
    customerName: r.customer_name,
    bookingDate: r.booking_date,
    slotTime: r.slot_time.slice(0, 5),
    serviceName: r.service_name,
    servicePrice: priceFromDb(r.service_price),
    serviceDurationMinutes: r.service_duration_minutes,
    status: r.status,
    cancelledBy: r.cancelled_by,
    staffName: r.shop_staff?.name ?? null,
    createdAt: r.created_at,
  }));

  // Rows are already newest-first by (date, slot). The most recent name on
  // record is the customer's preferred display name (unmasked — it's the
  // shop's own customer).
  const displayName = bookings[0]?.customerName ?? null;

  let totalVisits = 0;
  let cancelledCount = 0;
  let upcomingCount = 0;
  for (const b of bookings) {
    if (b.status === "completed") totalVisits += 1;
    else if (b.status === "cancelled") cancelledCount += 1;
    else if (b.status === "confirmed") upcomingCount += 1;
  }

  // First/last visit by calendar date. Rows are date-desc, so last is row[0]
  // and first is the final row.
  const lastVisit = bookings[0]?.bookingDate ?? null;
  const firstVisit = bookings[bookings.length - 1]?.bookingDate ?? null;

  return {
    displayName,
    totalVisits,
    cancelledCount,
    upcomingCount,
    firstVisit,
    lastVisit,
    bookings,
  };
}
