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
  /** Sum of service_price over COMPLETED bookings — money the shop realized. */
  lifetimeSpend: number;
  cancelledCount: number;
  upcomingCount: number; // confirmed bookings still on the calendar
  firstVisit: string | null; // earliest booking_date
  lastVisit: string | null; // latest booking_date (any status, incl. future)
  /** Latest COMPLETED booking_date — "last actually seen", excludes future. */
  lastCompletedVisit: string | null;
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
  lifetimeSpend: 0,
  cancelledCount: 0,
  upcomingCount: 0,
  firstVisit: null,
  lastVisit: null,
  lastCompletedVisit: null,
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
  let lifetimeSpend = 0;
  let cancelledCount = 0;
  let upcomingCount = 0;
  // Rows are date-desc, so the FIRST completed row we meet is the latest one.
  let lastCompletedVisit: string | null = null;
  for (const b of bookings) {
    if (b.status === "completed") {
      totalVisits += 1;
      lifetimeSpend += b.servicePrice ?? 0;
      if (lastCompletedVisit === null) lastCompletedVisit = b.bookingDate;
    } else if (b.status === "cancelled") cancelledCount += 1;
    else if (b.status === "confirmed") upcomingCount += 1;
  }

  // First/last visit by calendar date. Rows are date-desc, so last is row[0]
  // and first is the final row.
  const lastVisit = bookings[0]?.bookingDate ?? null;
  const firstVisit = bookings[bookings.length - 1]?.bookingDate ?? null;

  return {
    displayName,
    totalVisits,
    lifetimeSpend,
    cancelledCount,
    upcomingCount,
    firstVisit,
    lastVisit,
    lastCompletedVisit,
    bookings,
  };
}

// ----- Read: cross-shop contact card (registration + LINE reachability) ----

export type ShopCustomerContact = {
  /** True if this phone maps to a registered Quego customer (vs. a walk-in). */
  registered: boolean;
  /** True if that account has a linked LINE userId (reachable via Messaging API). */
  lineLinked: boolean;
};

const EMPTY_CONTACT: ShopCustomerContact = {
  registered: false,
  lineLinked: false,
};

/**
 * Cross-shop contact facts for a phone: whether it maps to a registered Quego
 * customer and whether that customer has linked LINE. Unlike the history read
 * above, this is NOT shop-scoped — `customers` is keyed by phone alone — but it
 * returns only two booleans (never the userId), and the phone is already the
 * shop's own customer's identity. Degrades to all-false on any infra error.
 */
export async function getShopCustomerContact(
  phone: string,
): Promise<ShopCustomerContact> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("customers")
    .select("id, line_user_id")
    .eq("phone", phone)
    .maybeSingle();

  if (error) {
    console.error("getShopCustomerContact error:", error);
    return EMPTY_CONTACT;
  }
  if (!data) return EMPTY_CONTACT;

  return {
    registered: true,
    lineLinked: Boolean(
      (data as { line_user_id: string | null }).line_user_id,
    ),
  };
}

// ----- Read: customer LIST for the shop (search + sort + paginate) ---------

export type CustomerSort = "recent" | "spend" | "visits" | "name";

/** One row of the shop's customer directory (the `shop_customer_summary` view). */
export type ShopCustomerListItem = {
  phone: string;
  displayName: string | null;
  totalVisits: number;
  lifetimeSpend: number;
  upcomingCount: number;
  cancelledCount: number;
  firstVisit: string | null;
  lastVisit: string | null;
  lastCompletedVisit: string | null;
};

export type ShopCustomerListPage = {
  customers: ShopCustomerListItem[];
  total: number; // total matching customers (for pagination)
  page: number; // 1-based
  pageSize: number;
};

type SummaryRow = {
  customer_phone: string;
  display_name: string | null;
  total_visits: number;
  lifetime_spend: number | string;
  upcoming_count: number;
  cancelled_count: number;
  first_visit: string | null;
  last_visit: string | null;
  last_completed_visit: string | null;
};

const EMPTY_LIST_PAGE = (page: number, pageSize: number): ShopCustomerListPage => ({
  customers: [],
  total: 0,
  page,
  pageSize,
});

/** Strip ilike wildcards + cap length so a search term matches literally. */
function sanitizeSearch(raw: string | undefined): string {
  return (raw ?? "").trim().replace(/[%_]/g, "").slice(0, 60);
}

/**
 * The shop's customer directory, read from the `shop_customer_summary` view
 * (one aggregated row per phone) — NOT by folding raw bookings in JS, which
 * would truncate at PostgREST's row cap for busy shops. `shopId` MUST come from
 * the verified session: it scopes the read to this shop's customers only.
 *
 * Search matches a name fragment, OR a phone fragment when the term is all
 * digits. Sort + pagination run in Postgres. Degrades to an empty page on any
 * infra error rather than throwing.
 */
export async function listCustomersForShop(
  shopId: string,
  opts: { q?: string; sort?: CustomerSort; page?: number; pageSize?: number } = {},
): Promise<ShopCustomerListPage> {
  const page = Math.max(1, Math.floor(opts.page ?? 1));
  const pageSize = Math.min(100, Math.max(1, Math.floor(opts.pageSize ?? 20)));
  const sort: CustomerSort = opts.sort ?? "recent";
  const term = sanitizeSearch(opts.q);

  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("shop_customer_summary")
    .select(
      `customer_phone, display_name, total_visits, lifetime_spend,
       upcoming_count, cancelled_count, first_visit, last_visit,
       last_completed_visit`,
      { count: "exact" },
    )
    .eq("shop_id", shopId);

  if (term) {
    // All-digit term → phone search; otherwise match the display name.
    query = /^\d+$/.test(term)
      ? query.ilike("customer_phone", `%${term}%`)
      : query.ilike("display_name", `%${term}%`);
  }

  // Primary sort + a stable phone tiebreaker so paging never drifts.
  if (sort === "spend") {
    query = query.order("lifetime_spend", { ascending: false });
  } else if (sort === "visits") {
    query = query.order("total_visits", { ascending: false });
  } else if (sort === "name") {
    query = query.order("display_name", { ascending: true, nullsFirst: false });
  } else {
    query = query.order("last_visit", { ascending: false, nullsFirst: false });
  }
  query = query.order("customer_phone", { ascending: true });

  const from = (page - 1) * pageSize;
  query = query.range(from, from + pageSize - 1);

  const { data, error, count } = await query;
  if (error || !data) {
    if (error) console.error("listCustomersForShop error:", error);
    return EMPTY_LIST_PAGE(page, pageSize);
  }

  const customers: ShopCustomerListItem[] = (data as unknown as SummaryRow[]).map(
    (r) => ({
      phone: r.customer_phone,
      displayName: r.display_name,
      totalVisits: r.total_visits,
      lifetimeSpend: priceFromDb(r.lifetime_spend) ?? 0,
      upcomingCount: r.upcoming_count,
      cancelledCount: r.cancelled_count,
      firstVisit: r.first_visit,
      lastVisit: r.last_visit,
      lastCompletedVisit: r.last_completed_visit,
    }),
  );

  return { customers, total: count ?? customers.length, page, pageSize };
}
