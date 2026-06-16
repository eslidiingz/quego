import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { pushLineMessage } from "@/lib/line/client";
import { buildBookingMessage } from "@/lib/line/format";
import {
  buildShopNotificationFlex,
  bookingDetailRows,
  type ShopFlexDetailRow,
} from "@/lib/line/booking-flex";
import { absoluteUrl } from "@/lib/url";

/**
 * Shop ↔ LINE binding + outbound notifications. SRP: the shops.line_user_id
 * lifecycle (bind / clear / status) and pushing a shop-facing message to the
 * bound account. Mirrors line-linking.ts (the customer side) — discriminated
 * unions, Thai messages, generic message on unexpected DB error, never throws
 * for domain errors. shopId always comes from the verified session/state.
 *
 * The userId itself is resolved by the OAuth callback (see lib/line/oauth.ts);
 * this module only persists and uses it.
 */

// ----- Bind / clear / status ----------------------------------------------

export type LinkShopLineResult =
  | { ok: true }
  | { ok: false; code: "already_linked" | "unknown"; message: string };

/** Bind a LINE userId to a shop. The partial-unique index is the 23505 backstop. */
export async function linkShopLine(
  shopId: string,
  lineUserId: string,
): Promise<LinkShopLineResult> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("shops")
    .update({ line_user_id: lineUserId })
    .eq("id", shopId);

  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        code: "already_linked",
        message: "บัญชี LINE นี้ถูกเชื่อมกับร้านอื่นแล้ว",
      };
    }
    console.error("linkShopLine error:", error);
    return {
      ok: false,
      code: "unknown",
      message: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง",
    };
  }
  return { ok: true };
}

export type UnlinkShopLineResult =
  | { ok: true }
  | { ok: false; code: "unknown"; message: string };

/** Clear a shop's LINE binding. shopId MUST come from the verified session. */
export async function unlinkShopLine(
  shopId: string,
): Promise<UnlinkShopLineResult> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("shops")
    .update({ line_user_id: null })
    .eq("id", shopId);
  if (error) {
    console.error("unlinkShopLine error:", error);
    return {
      ok: false,
      code: "unknown",
      message: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง",
    };
  }
  return { ok: true };
}

export type ShopLineStatus = { linked: boolean };

/** Whether a shop has a LINE account bound (drives the notifications tab UI). */
export async function getShopLineStatus(
  shopId: string,
): Promise<ShopLineStatus> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("shops")
    .select("line_user_id")
    .eq("id", shopId)
    .maybeSingle();
  if (error || !data) return { linked: false };
  return { linked: Boolean(data.line_user_id) };
}

// ----- Group binding (sender-match) ---------------------------------------

export type BindShopLineGroupResult =
  | { ok: true; shopName: string }
  | {
      ok: false;
      code: "not_linked" | "group_taken" | "unknown";
      message: string;
    };

/**
 * Bind a LINE group to the shop OWNED by the message sender (sender-match). The
 * groupId comes from a webhook event in the group; identity is proven not by a
 * pairing code but by the sender's userId already being a shop's bound
 * line_user_id (the owner linked their personal LINE in-app first). The target
 * shopId is therefore DERIVED here from senderUserId — never trusted from input
 * — mirroring the compound-filter ownership rule the other writes use. The
 * partial-unique index on line_group_id is the 23505 backstop (one group, one
 * shop).
 */
export async function bindShopLineGroupBySender(
  senderUserId: string,
  groupId: string,
): Promise<BindShopLineGroupResult> {
  const supabase = getSupabaseAdmin();
  const { data: shop, error } = await supabase
    .from("shops")
    .select("id, name")
    .eq("line_user_id", senderUserId)
    .maybeSingle();
  if (error) {
    console.error("bindShopLineGroupBySender lookup error:", error);
    return { ok: false, code: "unknown", message: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง" };
  }
  if (!shop) {
    return {
      ok: false,
      code: "not_linked",
      message:
        "บัญชี LINE ของคุณยังไม่ได้เชื่อมกับร้านใน quego — เปิดแอป quego ไปที่ " +
        "โปรไฟล์ › การแจ้งเตือน แล้วกด “เชื่อมต่อ LINE” ก่อน แล้วลองใหม่",
    };
  }
  const { error: upErr } = await supabase
    .from("shops")
    .update({ line_group_id: groupId })
    .eq("id", shop.id);
  if (upErr) {
    if (upErr.code === "23505") {
      return { ok: false, code: "group_taken", message: "กลุ่มนี้ถูกผูกกับร้านอื่นแล้ว" };
    }
    console.error("bindShopLineGroupBySender update error:", upErr);
    return { ok: false, code: "unknown", message: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง" };
  }
  return { ok: true, shopName: (shop.name as string) ?? "ร้านของคุณ" };
}

// ----- Outbound: notification recipient -----------------------------------

/**
 * Resolve where a shop's notifications go: the bound staff LINE group if set,
 * else the owner's personal LINE account, else null (the fail-silent no-op).
 * Single-sources the recipient decision for all four push* functions — pushing
 * to the group reaches every staff member at once, and the owner is already in
 * the group, so a bound group REPLACES the personal push (no double-billing).
 */
async function resolveShopNotifyTarget(shopId: string): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("shops")
    .select("line_group_id, line_user_id")
    .eq("id", shopId)
    .maybeSingle();
  if (error || !data) return null;
  return (
    (data.line_group_id as string | null) ??
    (data.line_user_id as string | null) ??
    null
  );
}

// ----- Outbound: new-booking notification ---------------------------------

export type NewBookingNotice = {
  customerName: string;
  serviceName: string | null;
  bookingDate: string; // "YYYY-MM-DD"
  slotTime: string; // "HH:MM"
};

/**
 * Shared notification chrome. Each event's heading is single-sourced here so the
 * flex bubble and its plain-text altText (the formatXxx body) can never drift,
 * and the accent color of the identity line carries the event's tone: green for
 * positive (new booking / on the way), red for a cancel, amber for a reschedule.
 * These mirror buildBookingConfirmationFlex on the customer side so the two
 * personas see the same product.
 */
const ACCENT_POSITIVE = "#1F7A3D"; // brand green
const ACCENT_DANGER = "#C0392B";
const ACCENT_WARNING = "#B45309"; // amber

const HEADING_NEW_BOOKING = "🔔 มีการจองใหม่";
const HEADING_CANCELLED = "❌ ลูกค้ายกเลิกการจอง";
const HEADING_ARRIVAL = "🚗 ลูกค้ากำลังมา";
const HEADING_RESCHEDULED = "🕓 ลูกค้าเลื่อนเวลา";

/**
 * The CTA every shop notice carries — one tap into the queue dashboard to act on
 * the booking. A neutral secondary button, so it never reads as destructive on a
 * cancel card. Resolved per call because absoluteUrl reads env at call time.
 */
function shopDashboardCta(): { label: string; uri: string } {
  return { label: "จัดการคิว", uri: absoluteUrl("/shop") };
}

/**
 * Build the Thai new-booking message body. Thin persona wrapper over the shared
 * builder (lib/line/format.ts) — owns only the shop-facing heading + identity
 * line. Exported so it stays unit-tested without a live channel; also rides
 * along as the flex altText (notification preview + non-flex clients).
 */
export function formatNewBookingMessage(notice: NewBookingNotice): string {
  return buildBookingMessage({
    heading: HEADING_NEW_BOOKING,
    identityLine: `ลูกค้า: ${notice.customerName}`,
    serviceName: notice.serviceName,
    bookingDate: notice.bookingDate,
    slotTime: notice.slotTime,
  });
}

/**
 * Push a new-booking notification to the shop's bound LINE account, if any.
 * Sends the flex card (the visual twin of the customer's confirmation bubble),
 * with formatNewBookingMessage as altText. Fail-silent by contract: a missing
 * binding is a no-op and any error is logged, never thrown — booking creation
 * must never fail because of a notification.
 */
export async function pushNewBookingToShop(
  shopId: string,
  notice: NewBookingNotice,
): Promise<void> {
  try {
    const to = await resolveShopNotifyTarget(shopId);
    if (!to) return;

    await pushLineMessage(
      to,
      [
        buildShopNotificationFlex({
          altText: formatNewBookingMessage(notice),
          heading: HEADING_NEW_BOOKING,
          accentColor: ACCENT_POSITIVE,
          customerName: notice.customerName,
          rows: bookingDetailRows(
            notice.serviceName,
            notice.bookingDate,
            notice.slotTime,
          ),
          cta: shopDashboardCta(),
        }),
      ],
      { kind: "new_booking" },
    );
  } catch (err) {
    console.error("pushNewBookingToShop error:", err);
  }
}

// ----- Outbound: customer-cancelled notification --------------------------

/**
 * Build the Thai "customer cancelled" message body for the shop. Reuses
 * NewBookingNotice — the facts are identical (who / what / when), only the
 * heading differs. The shop only ever receives a cancel notice for a
 * CUSTOMER-initiated cancel (a shop cancelling its own booking notifies the
 * customer, never itself), so the source is implicit in the recipient and the
 * heading states it directly — no separate "ยกเลิกโดย…" line is needed.
 */
export function formatBookingCancelledMessage(notice: NewBookingNotice): string {
  return buildBookingMessage({
    heading: HEADING_CANCELLED,
    identityLine: `ลูกค้า: ${notice.customerName}`,
    serviceName: notice.serviceName,
    bookingDate: notice.bookingDate,
    slotTime: notice.slotTime,
  });
}

/**
 * Push a customer-cancellation notice to the shop's bound LINE account, if any.
 * Sends the flex card (red accent) with formatBookingCancelledMessage as altText.
 * Fail-silent by contract (mirrors pushNewBookingToShop): a missing binding is
 * a no-op and any error is logged, never thrown — cancelling a booking must
 * never fail because of a notification.
 */
export async function pushBookingCancelledToShop(
  shopId: string,
  notice: NewBookingNotice,
): Promise<void> {
  try {
    const to = await resolveShopNotifyTarget(shopId);
    if (!to) return;

    await pushLineMessage(
      to,
      [
        buildShopNotificationFlex({
          altText: formatBookingCancelledMessage(notice),
          heading: HEADING_CANCELLED,
          accentColor: ACCENT_DANGER,
          customerName: notice.customerName,
          rows: bookingDetailRows(
            notice.serviceName,
            notice.bookingDate,
            notice.slotTime,
          ),
          cta: shopDashboardCta(),
        }),
      ],
      { kind: "booking_cancelled" },
    );
  } catch (err) {
    console.error("pushBookingCancelledToShop error:", err);
  }
}

// ----- Outbound: customer "กำลังมา" arrival ack (OPP-03) -------------------

/**
 * Build the Thai "customer is on the way" message for the shop. Reuses
 * NewBookingNotice (same who / what / when facts), only the heading differs.
 */
export function formatCustomerArrivalMessage(notice: NewBookingNotice): string {
  return buildBookingMessage({
    heading: HEADING_ARRIVAL,
    identityLine: `ลูกค้า: ${notice.customerName}`,
    serviceName: notice.serviceName,
    bookingDate: notice.bookingDate,
    slotTime: notice.slotTime,
  });
}

/**
 * Push a "customer tapped กำลังมา" notice to the shop's bound LINE account, if
 * any. Sends the flex card (green accent) with formatCustomerArrivalMessage as
 * altText. Fail-silent by contract — mirrors pushNewBookingToShop.
 */
export async function pushCustomerArrivalToShop(
  shopId: string,
  notice: NewBookingNotice,
): Promise<void> {
  try {
    const to = await resolveShopNotifyTarget(shopId);
    if (!to) return;

    await pushLineMessage(
      to,
      [
        buildShopNotificationFlex({
          altText: formatCustomerArrivalMessage(notice),
          heading: HEADING_ARRIVAL,
          accentColor: ACCENT_POSITIVE,
          customerName: notice.customerName,
          rows: bookingDetailRows(
            notice.serviceName,
            notice.bookingDate,
            notice.slotTime,
          ),
          cta: shopDashboardCta(),
        }),
      ],
      { kind: "customer_arrival" },
    );
  } catch (err) {
    console.error("pushCustomerArrivalToShop error:", err);
  }
}

// ----- Outbound: customer reschedule notice (OPP-04) ----------------------

export type RescheduleNotice = {
  customerName: string;
  serviceName: string | null;
  fromDate: string; // "YYYY-MM-DD"
  fromSlotTime: string; // "HH:MM"
  toDate: string;
  toSlotTime: string;
};

/** "DD/MM/YYYY" — mirrors lib/line/format.ts formatBookingDate. */
function formatNoticeDate(ymd: string): string {
  const [y, m, d] = ymd.split("-");
  return `${d}/${m}/${y}`;
}

/**
 * Build the Thai "customer rescheduled" message for the shop. Has two datetime
 * lines (from → to), so it composes the body directly rather than via the
 * single-datetime shared builder.
 */
export function formatBookingRescheduledMessage(notice: RescheduleNotice): string {
  const lines = [HEADING_RESCHEDULED, `ลูกค้า: ${notice.customerName}`];
  if (notice.serviceName) lines.push(`บริการ: ${notice.serviceName}`);
  lines.push(
    `จาก: ${formatNoticeDate(notice.fromDate)} ${notice.fromSlotTime} น.`,
    `เป็น: ${formatNoticeDate(notice.toDate)} ${notice.toSlotTime} น.`,
  );
  return lines.join("\n");
}

/**
 * The flex detail rows for a reschedule — the two-datetime (จาก → เป็น) shape,
 * which is why this composes rows directly rather than via bookingDetailRows.
 */
function rescheduleDetailRows(notice: RescheduleNotice): ShopFlexDetailRow[] {
  const rows: ShopFlexDetailRow[] = [];
  if (notice.serviceName) rows.push({ label: "บริการ", value: notice.serviceName });
  rows.push(
    { label: "จาก", value: `${formatNoticeDate(notice.fromDate)} ${notice.fromSlotTime} น.` },
    { label: "เป็น", value: `${formatNoticeDate(notice.toDate)} ${notice.toSlotTime} น.` },
  );
  return rows;
}

/**
 * Push a reschedule notice to the shop's bound LINE account, if any. Sends the
 * flex card (amber accent, จาก → เป็น rows) with formatBookingRescheduledMessage
 * as altText. Fail-silent by contract — mirrors pushNewBookingToShop.
 */
export async function pushBookingRescheduledToShop(
  shopId: string,
  notice: RescheduleNotice,
): Promise<void> {
  try {
    const to = await resolveShopNotifyTarget(shopId);
    if (!to) return;

    await pushLineMessage(
      to,
      [
        buildShopNotificationFlex({
          altText: formatBookingRescheduledMessage(notice),
          heading: HEADING_RESCHEDULED,
          accentColor: ACCENT_WARNING,
          customerName: notice.customerName,
          rows: rescheduleDetailRows(notice),
          cta: shopDashboardCta(),
        }),
      ],
      { kind: "booking_rescheduled" },
    );
  } catch (err) {
    console.error("pushBookingRescheduledToShop error:", err);
  }
}
