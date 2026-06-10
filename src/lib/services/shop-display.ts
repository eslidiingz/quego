import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getBangkokToday, getBangkokNow } from "@/lib/time/bangkok";
import { DEFAULT_SERVICE_DURATION_MINUTES } from "@/lib/booking/queue-position";
import {
  buildDisplayQueue,
  type DisplayQueueRow,
  type DisplayQueueSnapshot,
} from "@/lib/booking/queue-display";

/**
 * Read-aggregate for the shop's full-screen waiting-room DISPLAY (`/shop/display`,
 * OPP-07). Reads today's confirmed bookings for ONE shop and folds them — via the
 * pure `buildDisplayQueue` — into a now-serving + upcoming snapshot.
 *
 * It is the SAME confirmed-lane model the customer position view uses
 * (`getBookingQueueStatus` / `getShopPublicQueueStatus` in `bookings.ts`): today's
 * confirmed bookings, the wall-clock `slot >= now` cutoff applied inside the pure
 * math, so the kiosk and the customer's "อีก N คิวก่อนถึงคุณ" never disagree about
 * which bookings still count. We just additionally carry masked display fields.
 *
 * SRP: this file does the read + row mapping; the queue math is the pure module
 * and persistence/transitions stay in `bookings.ts`. It never throws for an infra
 * hiccup — it degrades to an empty snapshot so the kiosk shows the empty state
 * rather than a crash.
 */

/** The snapshot the display page + polling action return. */
export type ShopDisplaySnapshot = DisplayQueueSnapshot;

/** Bookings row shape we select for the display (mirrors bookings.ts shapes). */
type DisplayBookingRow = {
  id: string;
  slot_time: string;
  created_at: string;
  staff_id: string | null;
  service_duration_minutes: number | null;
  customer_name: string | null;
  service_name: string | null;
  shop_staff: { name: string } | null;
};

const EMPTY_SNAPSHOT: ShopDisplaySnapshot = {
  nowServing: null,
  upcoming: [],
  nextToCallBookingId: null,
  waitingCount: 0,
};

/**
 * Mask a customer's display name for the waiting room (PDPA): "first
 * last-initial" (e.g. "สมชาย ก."), a single-token name unchanged, and a generic
 * label for a blank name. Mirrors `maskReviewerName` in `reviews.ts` so the
 * masking rule is consistent across surfaces.
 */
function maskCustomerName(name: string | null): string {
  const trimmed = (name ?? "").trim();
  if (trimmed.length === 0) return "ลูกค้า";
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[1].charAt(0)}.`;
}

/**
 * Build the waiting-room snapshot for `shopId`. Ownership is the caller's
 * responsibility — the action/page passes the `shopId` from the verified shop
 * session, never request input. We only ever read this one shop's today rows.
 */
export async function getShopDisplayQueue(
  shopId: string,
): Promise<ShopDisplaySnapshot> {
  const supabase = getSupabaseAdmin();
  const today = getBangkokToday();

  const { data, error } = await supabase
    .from("bookings")
    .select(
      `id, slot_time, created_at, staff_id, service_duration_minutes,
       customer_name, service_name,
       shop_staff ( name )`,
    )
    .eq("shop_id", shopId)
    .eq("booking_date", today)
    .eq("status", "confirmed");

  if (error || !data) {
    if (error) console.error("getShopDisplayQueue error:", error);
    // Degrade to empty rather than throw — the kiosk shows its empty state.
    return EMPTY_SNAPSHOT;
  }

  const rows: DisplayQueueRow[] = (data as unknown as DisplayBookingRow[]).map(
    (r) => ({
      id: r.id,
      slotTime: r.slot_time.slice(0, 5),
      createdAt: r.created_at,
      staffId: r.staff_id,
      durationMinutes:
        r.service_duration_minutes ?? DEFAULT_SERVICE_DURATION_MINUTES,
      customerName: maskCustomerName(r.customer_name),
      serviceName: r.service_name,
      staffName: r.shop_staff?.name ?? null,
    }),
  );

  return buildDisplayQueue(rows, getBangkokNow().timeHHMM);
}
