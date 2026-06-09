import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { pushLineMessage } from "@/lib/line/client";
import { buildBookingMessage } from "@/lib/line/format";

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

// ----- Outbound: new-booking notification ---------------------------------

export type NewBookingNotice = {
  customerName: string;
  serviceName: string | null;
  bookingDate: string; // "YYYY-MM-DD"
  slotTime: string; // "HH:MM"
};

/**
 * Build the Thai new-booking message body. Thin persona wrapper over the shared
 * builder (lib/line/format.ts) — owns only the shop-facing heading + identity
 * line. Exported so it stays unit-tested without a live channel.
 */
export function formatNewBookingMessage(notice: NewBookingNotice): string {
  return buildBookingMessage({
    heading: "🔔 มีการจองใหม่",
    identityLine: `ลูกค้า: ${notice.customerName}`,
    serviceName: notice.serviceName,
    bookingDate: notice.bookingDate,
    slotTime: notice.slotTime,
  });
}

/**
 * Push a new-booking notification to the shop's bound LINE account, if any.
 * Fail-silent by contract: a missing binding is a no-op and any error is logged,
 * never thrown — booking creation must never fail because of a notification.
 */
export async function pushNewBookingToShop(
  shopId: string,
  notice: NewBookingNotice,
): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("shops")
      .select("line_user_id")
      .eq("id", shopId)
      .maybeSingle();
    if (error || !data?.line_user_id) return;

    await pushLineMessage(
      data.line_user_id as string,
      [{ type: "text", text: formatNewBookingMessage(notice) }],
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
    heading: "❌ ลูกค้ายกเลิกการจอง",
    identityLine: `ลูกค้า: ${notice.customerName}`,
    serviceName: notice.serviceName,
    bookingDate: notice.bookingDate,
    slotTime: notice.slotTime,
  });
}

/**
 * Push a customer-cancellation notice to the shop's bound LINE account, if any.
 * Fail-silent by contract (mirrors pushNewBookingToShop): a missing binding is
 * a no-op and any error is logged, never thrown — cancelling a booking must
 * never fail because of a notification.
 */
export async function pushBookingCancelledToShop(
  shopId: string,
  notice: NewBookingNotice,
): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("shops")
      .select("line_user_id")
      .eq("id", shopId)
      .maybeSingle();
    if (error || !data?.line_user_id) return;

    await pushLineMessage(
      data.line_user_id as string,
      [{ type: "text", text: formatBookingCancelledMessage(notice) }],
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
    heading: "🚶 ลูกค้ากำลังมา",
    identityLine: `ลูกค้า: ${notice.customerName}`,
    serviceName: notice.serviceName,
    bookingDate: notice.bookingDate,
    slotTime: notice.slotTime,
  });
}

/**
 * Push a "customer tapped กำลังมา" notice to the shop's bound LINE account, if
 * any. Fail-silent by contract — mirrors pushNewBookingToShop.
 */
export async function pushCustomerArrivalToShop(
  shopId: string,
  notice: NewBookingNotice,
): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("shops")
      .select("line_user_id")
      .eq("id", shopId)
      .maybeSingle();
    if (error || !data?.line_user_id) return;

    await pushLineMessage(
      data.line_user_id as string,
      [{ type: "text", text: formatCustomerArrivalMessage(notice) }],
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
  const lines = ["🕓 ลูกค้าเลื่อนเวลา", `ลูกค้า: ${notice.customerName}`];
  if (notice.serviceName) lines.push(`บริการ: ${notice.serviceName}`);
  lines.push(
    `จาก: ${formatNoticeDate(notice.fromDate)} ${notice.fromSlotTime} น.`,
    `เป็น: ${formatNoticeDate(notice.toDate)} ${notice.toSlotTime} น.`,
  );
  return lines.join("\n");
}

/**
 * Push a reschedule notice to the shop's bound LINE account, if any.
 * Fail-silent by contract — mirrors pushNewBookingToShop.
 */
export async function pushBookingRescheduledToShop(
  shopId: string,
  notice: RescheduleNotice,
): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("shops")
      .select("line_user_id")
      .eq("id", shopId)
      .maybeSingle();
    if (error || !data?.line_user_id) return;

    await pushLineMessage(
      data.line_user_id as string,
      [{ type: "text", text: formatBookingRescheduledMessage(notice) }],
      { kind: "booking_rescheduled" },
    );
  } catch (err) {
    console.error("pushBookingRescheduledToShop error:", err);
  }
}
