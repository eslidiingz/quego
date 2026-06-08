import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { pushLineMessage } from "@/lib/line/client";
import { buildBookingMessage } from "@/lib/line/format";

/**
 * Customer ↔ LINE binding. SRP: the customers.line_user_id lifecycle
 * (bind / clear / status) plus the reverse lookup used to route outbound
 * notifications to a customer. Mirrors shop-line.ts (the shop side) — both
 * personas now connect through the same LINE Login OAuth handshake
 * (lib/line/oauth.ts), and this module only persists and reads the userId that
 * handshake resolves. Phone stays the identity key; line_user_id is an optional
 * channel handle (see the migration).
 *
 * Conventions mirror customers.ts: discriminated-union results with Thai
 * messages, never throws for domain errors, and a generic message on unexpected
 * DB errors (the real detail is console.error'd server-side, never leaked).
 */

// ----- Bind (from the OAuth callback) -------------------------------------

export type LinkCustomerLineResult =
  | { ok: true }
  | { ok: false; code: "already_linked" | "unknown"; message: string };

/**
 * Bind a LINE userId to a customer. customerId MUST come from the verified
 * session/state (the OAuth callback). The partial-unique index on
 * customers.line_user_id is the 23505 backstop if the same LINE account is
 * already bound to a different customer.
 */
export async function linkCustomerLine(
  customerId: string,
  lineUserId: string,
): Promise<LinkCustomerLineResult> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("customers")
    .update({ line_user_id: lineUserId })
    .eq("id", customerId);

  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        code: "already_linked",
        message: "บัญชี LINE นี้ถูกเชื่อมกับผู้ใช้อื่นแล้ว",
      };
    }
    console.error("linkCustomerLine error:", error);
    return {
      ok: false,
      code: "unknown",
      message: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง",
    };
  }
  return { ok: true };
}

// ----- Reverse lookup + status + unlink -----------------------------------

/**
 * Find the customer bound to a LINE userId. The outbound-routing seam: a
 * customer-facing notification sequence resolves a recipient through here before
 * calling pushLineMessage.
 */
export async function findCustomerByLineUserId(
  lineUserId: string,
): Promise<{ id: string; phone: string } | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("customers")
    .select("id, phone")
    .eq("line_user_id", lineUserId)
    .maybeSingle();
  if (error || !data) return null;
  return { id: data.id as string, phone: data.phone as string };
}

export type LineLinkStatus = { linked: boolean };

/** Whether a customer has a LINE account bound (drives the profile UI state). */
export async function getLineLinkStatus(
  customerId: string,
): Promise<LineLinkStatus> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("customers")
    .select("line_user_id")
    .eq("id", customerId)
    .maybeSingle();
  if (error || !data) return { linked: false };
  return { linked: Boolean(data.line_user_id) };
}

export type UnlinkResult =
  | { ok: true }
  | { ok: false; code: "unknown"; message: string };

/** Clear a customer's LINE binding. customerId MUST come from the session. */
export async function unlinkCustomerLine(
  customerId: string,
): Promise<UnlinkResult> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("customers")
    .update({ line_user_id: null })
    .eq("id", customerId);
  if (error) {
    console.error("unlinkCustomerLine error:", error);
    return {
      ok: false,
      code: "unknown",
      message: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง",
    };
  }
  return { ok: true };
}

// ----- Outbound: booking-confirmation notification ------------------------

export type BookingConfirmationNotice = {
  shopName: string;
  serviceName: string | null;
  bookingDate: string; // "YYYY-MM-DD"
  slotTime: string; // "HH:MM"
};

/**
 * Build the Thai booking-confirmation message body. Thin persona wrapper over
 * the shared builder (lib/line/format.ts) — owns only the customer-facing
 * heading + identity line. Mirrors shop-line.ts's formatNewBookingMessage.
 */
export function formatBookingConfirmationMessage(
  notice: BookingConfirmationNotice,
): string {
  return buildBookingMessage({
    heading: "✅ ยืนยันการจอง",
    identityLine: `ร้าน: ${notice.shopName}`,
    serviceName: notice.serviceName,
    bookingDate: notice.bookingDate,
    slotTime: notice.slotTime,
  });
}

/**
 * Push a booking-confirmation to the customer's bound LINE account, if any.
 * The recipient is resolved by phone (the booking identity key); a customer
 * with no record or no binding is a silent no-op. Fail-silent by contract:
 * any error is logged, never thrown — booking creation must never fail because
 * of a notification. Mirrors shop-line.ts's pushNewBookingToShop.
 */
export async function pushBookingConfirmationToCustomer(
  phone: string,
  notice: BookingConfirmationNotice,
): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("customers")
      .select("line_user_id")
      .eq("phone", phone)
      .maybeSingle();
    if (error || !data?.line_user_id) return;

    await pushLineMessage(
      data.line_user_id as string,
      [{ type: "text", text: formatBookingConfirmationMessage(notice) }],
      { kind: "booking_confirmation" },
    );
  } catch (err) {
    console.error("pushBookingConfirmationToCustomer error:", err);
  }
}
