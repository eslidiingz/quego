import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getBangkokToday } from "@/lib/time/bangkok";
import { getBookingContext } from "@/lib/services/bookings";
import { hasOpenSlotForService, isReofferable } from "@/lib/waitlist/eligibility";
import { pushWaitlistSlotOpenToCustomer } from "@/lib/services/line-linking";
import { isValidThaiPhone } from "@/lib/validation/phone";

/**
 * Waitlist service (OPP-05). When a (shop, service, date) is fully booked a
 * customer can ask to be notified once a slot frees; on cancel/reschedule-away
 * the freed capacity is offered over LINE to the oldest eligible waitlister.
 *
 * SRP + conventions mirror the other services: `server-only`, all access via the
 * service-role client (RLS deny-all on `waitlist_entries`), discriminated-union
 * results with Thai messages, never throws for domain errors. Phone is the
 * identity key (mirrors bookings/reviews), so an anonymous booking and an
 * authenticated one surface under the same waitlist row.
 *
 * Design notes:
 *  - The freed slot is NEVER held — it stays openly bookable. The LINE push is a
 *    HEAD START into the normal, race-safe `createBooking` flow (GiST exclusion is
 *    the backstop), not a reservation. This keeps the feature on the project's
 *    polling/`after()` rails with no background timer/cron.
 *  - "Roll on if unclaimed" is event-driven: a notified entry that ignores its
 *    nudge becomes re-offerable (see `isReofferable`) on the NEXT free event, so
 *    the offer advances as real cancellations happen.
 *  - Availability is re-verified with the SAME `BookingContext`/slot-math the
 *    picker uses, so a cancellation on staff X never falsely pings a waitlister
 *    whose service needs staff Y.
 */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/u;

const ACTIVE_STATUSES = ["waiting", "notified"] as const;

// ----- Join ---------------------------------------------------------------

export type JoinWaitlistInput = {
  shopId: string;
  serviceId: string;
  preferredStaffId?: string | null;
  requestedDate: string; // YYYY-MM-DD
  customerName: string;
  customerPhone: string;
};

export type JoinWaitlistResult =
  | { ok: true; alreadyWaiting: boolean }
  | {
      ok: false;
      code:
        | "invalid"
        | "shop_unavailable"
        | "service_unavailable"
        | "date_invalid"
        | "slots_available"
        | "unknown";
      message: string;
    };

/**
 * Add a customer to the waitlist for a fully-booked (shop, service, date). Loads
 * the live booking context to re-validate the shop/service/date AND to confirm
 * it is actually full — if a slot is open right now, returns `slots_available`
 * so the UI nudges the customer to just book (the page likely went stale between
 * render and submit). A duplicate active entry is a benign no-op (the partial
 * unique index raises 23505 → `alreadyWaiting: true`).
 */
export async function joinWaitlist(
  input: JoinWaitlistInput,
): Promise<JoinWaitlistResult> {
  const name = input.customerName.trim();
  const phone = input.customerPhone.trim();
  const serviceId = input.serviceId.trim();
  const preferredStaffId = input.preferredStaffId?.trim() || null;

  if (
    !isValidThaiPhone(phone) ||
    !DATE_RE.test(input.requestedDate) ||
    name.length === 0 ||
    name.length > 100 ||
    serviceId.length === 0
  ) {
    return { ok: false, code: "invalid", message: "ข้อมูลไม่ถูกต้อง" };
  }

  // Same single source of truth the booking form renders from.
  const context = await getBookingContext(input.shopId);
  if (!context) {
    return {
      ok: false,
      code: "shop_unavailable",
      message: "ร้านนี้ยังไม่พร้อมรับการจอง",
    };
  }

  const service = context.services.find((s) => s.id === serviceId);
  if (!service || service.id === null) {
    return {
      ok: false,
      code: "service_unavailable",
      message: "บริการที่เลือกไม่พร้อมให้บริการแล้ว",
    };
  }

  // Validate the preferred staff against THIS service (mirrors createBooking,
  // which only ever assigns a shop-scoped, service-capable staff). A foreign,
  // stale, or incapable id is dropped to "any staff" rather than persisted — so
  // a tampered payload can't store a cross-shop staff_id (which would otherwise
  // surface as a stray staff name on /me/waitlist via the embedded join).
  const effectiveStaffId =
    preferredStaffId &&
    service.staffIds !== null &&
    service.staffIds.includes(preferredStaffId)
      ? preferredStaffId
      : null;

  if (
    input.requestedDate < context.windowStart ||
    input.requestedDate > context.windowEnd ||
    input.requestedDate < getBangkokToday()
  ) {
    return {
      ok: false,
      code: "date_invalid",
      message: "วันที่เลือกอยู่นอกช่วงที่จองได้",
    };
  }

  // Nothing to wait for if a slot is actually open — book instead.
  if (
    hasOpenSlotForService(context, {
      serviceId,
      preferredStaffId: effectiveStaffId,
      date: input.requestedDate,
    })
  ) {
    return {
      ok: false,
      code: "slots_available",
      message: "มีคิวว่างแล้ว กรุณาเลือกเวลาเพื่อจอง",
    };
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("waitlist_entries").insert({
    shop_id: input.shopId,
    service_id: serviceId,
    service_name: service.name,
    preferred_staff_id: effectiveStaffId,
    requested_date: input.requestedDate,
    customer_phone: phone,
    customer_name: name,
  });

  if (error) {
    // 23505 = the active-entry partial unique index — already on this list.
    if (error.code === "23505") {
      return { ok: true, alreadyWaiting: true };
    }
    console.error("joinWaitlist insert error:", error);
    return {
      ok: false,
      code: "unknown",
      message: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง",
    };
  }
  return { ok: true, alreadyWaiting: false };
}

// ----- Customer "my waitlist" view ----------------------------------------

export type WaitlistItem = {
  id: string;
  shopId: string;
  shopName: string;
  serviceName: string;
  /** Preferred staff, if the customer pinned one; null = "ใครก็ได้". */
  staffName: string | null;
  requestedDate: string; // YYYY-MM-DD
  status: "waiting" | "notified";
  /** When the "slot opened" push was last sent; null while still waiting. */
  notifiedAt: string | null;
  /** Deep link straight into the booking form, prefilled to this entry. */
  bookPath: string;
  createdAt: string;
};

type WaitlistRow = {
  id: string;
  shop_id: string;
  service_id: string;
  service_name: string;
  preferred_staff_id: string | null;
  requested_date: string;
  status: "waiting" | "notified";
  notified_at: string | null;
  created_at: string;
  shops: { name: string } | null;
  shop_staff: { name: string } | null;
};

/**
 * List a customer's ACTIVE waitlist entries (waiting/notified) for today or
 * later, oldest-requested first. Keyed by phone — the customer identity key.
 */
export async function listWaitlistForCustomer(
  phone: string,
): Promise<WaitlistItem[]> {
  const supabase = getSupabaseAdmin();
  const today = getBangkokToday();

  const { data, error } = await supabase
    .from("waitlist_entries")
    .select(
      `id, shop_id, service_id, service_name, preferred_staff_id, requested_date,
       status, notified_at, created_at,
       shops ( name ),
       shop_staff ( name )`,
    )
    .eq("customer_phone", phone)
    .in("status", ACTIVE_STATUSES)
    .gte("requested_date", today)
    .order("requested_date", { ascending: true })
    .order("created_at", { ascending: true });

  if (error || !data) return [];

  return (data as unknown as WaitlistRow[]).map((r) => ({
    id: r.id,
    shopId: r.shop_id,
    shopName: r.shops?.name ?? "—",
    serviceName: r.service_name,
    staffName: r.shop_staff?.name ?? null,
    requestedDate: r.requested_date,
    status: r.status,
    notifiedAt: r.notified_at,
    bookPath: buildBookPath(r.shop_id, r.service_id, r.preferred_staff_id, r.requested_date),
    createdAt: r.created_at,
  }));
}

/**
 * Count a customer's ACTIONABLE waitlist entries — ones where a slot has opened
 * (`status = 'notified'`) for today or later — keyed by phone. Drives the live
 * count badge on the รอคิว nav tab ({@link WaitlistNavBadge}). It counts open
 * slots, not "unread" notices: the badge persists until the customer actually
 * books or leaves the list (viewing the page doesn't clear it), because the
 * count is an outstanding-action signal, not a since-last-seen one. Never throws
 * — a read error returns 0 so the badge fails closed (hidden) rather than loud.
 */
export async function countOpenWaitlistSlots(phone: string): Promise<number> {
  const supabase = getSupabaseAdmin();
  const today = getBangkokToday();

  const { count, error } = await supabase
    .from("waitlist_entries")
    .select("id", { count: "exact", head: true })
    .eq("customer_phone", phone)
    .eq("status", "notified")
    .gte("requested_date", today);

  if (error || count == null) return 0;
  return count;
}

/**
 * Count how many customers are on a SHOP's waitlist for today — active entries
 * (waiting/notified) whose `requested_date` is today. Drives the dashboard
 * glance card "มี N คนรอคิวว่างวันนี้" (OPP-21), letting the owner proactively
 * free a slot (e.g. cancel a no-show) so the existing offer engine can roll it
 * on. Shop-keyed (mirrors `listBookingsByShop`): filters on `shop_id` from the
 * verified session only, so it never leaks another shop's count. Never throws —
 * a read error returns 0 so the card fails closed (hidden) rather than loud.
 */
export async function countWaitingForShopToday(shopId: string): Promise<number> {
  const supabase = getSupabaseAdmin();
  const today = getBangkokToday();

  const { count, error } = await supabase
    .from("waitlist_entries")
    .select("id", { count: "exact", head: true })
    .eq("shop_id", shopId)
    .eq("requested_date", today)
    .in("status", ACTIVE_STATUSES);

  if (error || count == null) return 0;
  return count;
}

// ----- Cancel (leave the list) --------------------------------------------

export type CancelWaitlistResult =
  | { ok: true }
  | { ok: false; code: "not_found" | "unknown"; message: string };

/**
 * Leave the waitlist. Keyed by `customer_phone` (which MUST come from the
 * verified session) plus an active status, so a customer can only ever retract
 * their own pending entry.
 */
export async function cancelWaitlistEntry(
  entryId: string,
  customerPhone: string,
): Promise<CancelWaitlistResult> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("waitlist_entries")
    .update({ status: "cancelled" })
    .eq("id", entryId)
    .eq("customer_phone", customerPhone)
    .in("status", ACTIVE_STATUSES)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("cancelWaitlistEntry error:", error);
    return { ok: false, code: "unknown", message: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง" };
  }
  if (!data) {
    return { ok: false, code: "not_found", message: "ไม่พบรายการรอคิวนี้" };
  }
  return { ok: true };
}

// ----- Hooks fired from the bookings service (fail-silent, off-response) ----

/**
 * Clear a customer's waitlist entry for a (shop, service, date) once they book
 * it. Fire-and-forget from `createBooking` (mirrors the LINE confirmation push):
 * idempotent, never throws. Anonymous bookings (no phone / no service) are a
 * no-op.
 */
export async function resolveWaitlistForBooking(
  shopId: string,
  serviceId: string | null,
  date: string,
  phone: string | null,
  bookingId: string,
): Promise<void> {
  try {
    if (!serviceId || !phone) return;
    const supabase = getSupabaseAdmin();
    await supabase
      .from("waitlist_entries")
      .update({ status: "fulfilled", fulfilled_booking_id: bookingId })
      .eq("shop_id", shopId)
      .eq("service_id", serviceId)
      .eq("requested_date", date)
      .eq("customer_phone", phone)
      .in("status", ACTIVE_STATUSES);
  } catch (err) {
    console.error("resolveWaitlistForBooking error:", err);
  }
}

type OfferCandidateRow = {
  id: string;
  service_id: string;
  preferred_staff_id: string | null;
  customer_phone: string;
  service_name: string;
  status: string;
  notified_at: string | null;
};

/**
 * A booking just freed capacity on (shopId, date) — offer it to the front of the
 * waitlist. Fire-and-forget from the cancel/reschedule paths (mirrors the
 * cancel LINE pushes): never throws, off the response path.
 *
 * Picks the OLDEST eligible entry (see `isReofferable`) that now has a genuinely
 * open slot for its service/staff, marks it `notified`, and — if that customer
 * has linked LINE — also pushes the "slot opened" bubble with a one-tap deep
 * link back into the booking form. Exactly one offer per freed slot; the rest
 * roll on to the next cancellation. The `notified` flip happens regardless of
 * LINE binding, so the in-app /me/waitlist card and the รอคิว nav badge surface
 * the open slot via polling even for a customer who never linked LINE — the
 * oldest waiter keeps their rightful place rather than being skipped.
 *
 * Best-effort by contract: on a simultaneous double-cancel two offers could in
 * principle go out, which is harmless (an extra nudge), so no heavy lock — in
 * keeping with the fail-silent LINE model.
 */
export async function offerWaitlistForFreedSlot(
  shopId: string,
  date: string,
): Promise<void> {
  try {
    if (date < getBangkokToday()) return; // a freed past slot helps no one

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("waitlist_entries")
      .select(
        "id, service_id, preferred_staff_id, customer_phone, service_name, status, notified_at",
      )
      .eq("shop_id", shopId)
      .eq("requested_date", date)
      .in("status", ACTIVE_STATUSES)
      .order("created_at", { ascending: true })
      .limit(50);

    if (error || !data || data.length === 0) return;

    const nowMs = Date.now();
    const candidates = (data as OfferCandidateRow[]).filter((e) =>
      isReofferable({ status: e.status, notifiedAt: e.notified_at }, nowMs),
    );
    if (candidates.length === 0) return;

    // Load the live availability context once.
    const context = await getBookingContext(shopId);
    if (!context) return;

    for (const entry of candidates) {
      const open = hasOpenSlotForService(context, {
        serviceId: entry.service_id,
        preferredStaffId: entry.preferred_staff_id,
        date,
      });
      if (!open) continue;

      // Claim the offer for this entry by marking it notified BEFORE any push,
      // so a concurrent free-event is less likely to double-offer. Conditional
      // on the row still being active. This happens REGARDLESS of LINE binding:
      // the in-app /me/waitlist card + the รอคิว nav badge surface the open slot
      // via polling, so an unlinked customer still finds out.
      const { data: claimed } = await supabase
        .from("waitlist_entries")
        .update({ status: "notified", notified_at: new Date().toISOString() })
        .eq("id", entry.id)
        .in("status", ACTIVE_STATUSES)
        .select("id")
        .maybeSingle();
      if (!claimed) continue; // lost a race; try the next candidate

      // LINE push is a bonus layer on top of the in-app signal — sent only when
      // the customer has linked LINE. Fail-silent inside the helper, so a missing
      // channel token (pre-go-live) never breaks the in-app flow above.
      const { data: customer } = await supabase
        .from("customers")
        .select("line_user_id")
        .eq("phone", entry.customer_phone)
        .maybeSingle();
      const lineUserId = customer?.line_user_id as string | undefined;
      if (lineUserId) {
        await pushWaitlistSlotOpenToCustomer(lineUserId, {
          shopId,
          shopName: context.shop.name,
          serviceName: entry.service_name,
          serviceId: entry.service_id,
          preferredStaffId: entry.preferred_staff_id,
          date,
        });
      }
      return; // one offer per freed slot
    }
  } catch (err) {
    console.error("offerWaitlistForFreedSlot error:", err);
  }
}

// ----- Internal -----------------------------------------------------------

/** Deep link into the booking form, prefilled to a waitlist entry. */
function buildBookPath(
  shopId: string,
  serviceId: string,
  preferredStaffId: string | null,
  date: string,
): string {
  const params = new URLSearchParams({ serviceId, date });
  if (preferredStaffId) params.set("staffId", preferredStaffId);
  return `/shops/${shopId}/book?${params.toString()}`;
}
