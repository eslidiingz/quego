import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { pushLineMessage } from "@/lib/line/client";

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

/** "YYYY-MM-DD" → "DD/MM/YYYY" — locale-independent so the test is stable. */
function formatBookingDate(ymd: string): string {
  const [y, m, d] = ymd.split("-");
  return `${d}/${m}/${y}`;
}

/**
 * Build the Thai new-booking message body. Pure + exported so it is unit-tested
 * without a live channel. The service line is omitted when no service is set.
 */
export function formatNewBookingMessage(notice: NewBookingNotice): string {
  const lines = ["🔔 มีการจองใหม่", `ลูกค้า: ${notice.customerName}`];
  if (notice.serviceName) {
    lines.push(`บริการ: ${notice.serviceName}`);
  }
  lines.push(
    `วันเวลา: ${formatBookingDate(notice.bookingDate)} ${notice.slotTime} น.`,
  );
  return lines.join("\n");
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
