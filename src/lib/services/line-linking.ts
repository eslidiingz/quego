import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getLineOaBasicId } from "@/lib/line/config";
import { generateLinkCode, LINK_COMMAND_TEXT } from "@/lib/line/link-code";

/**
 * Account-link service: bind a LINE userId to a logged-in customer via a
 * short-lived, single-use code the customer sends into the OA chat. SRP: the DB
 * binding + code lifecycle. Speaks no HTTP (the webhook + client do that) and
 * keeps the LINE concern out of customers.ts. Phone stays the identity key;
 * line_user_id is an optional channel handle (see the migration).
 *
 * Mirrors customers.ts: discriminated-union results with Thai messages, never
 * throws for domain errors, and a generic message on unexpected DB errors (the
 * real detail is console.error'd server-side, never leaked to the caller).
 */

const LINK_CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes — mirrors login-intent.
const MAX_CODE_INSERT_RETRIES = 3;

// ----- Request a code -----------------------------------------------------

export type RequestLinkResult =
  | { ok: true; code: string; deepLink: string }
  | { ok: false; code: "unknown"; message: string };

/**
 * Issue a fresh one-time link code for a logged-in customer and build the LINE
 * deep link that pre-fills the OA chat with it. customerId MUST come from the
 * verified session.
 */
export async function requestLineLinkCode(
  customerId: string,
): Promise<RequestLinkResult> {
  const supabase = getSupabaseAdmin();
  const expiresAt = new Date(Date.now() + LINK_CODE_TTL_MS).toISOString();

  try {
    // Resolve the OA id once up front — a missing config is a setup error, not a
    // per-attempt one. The deep link is built per code below.
    getLineOaBasicId();
  } catch (err) {
    console.error("requestLineLinkCode config error:", err);
    return {
      ok: false,
      code: "unknown",
      message: "ระบบยังไม่พร้อมเชื่อม LINE กรุณาลองใหม่ภายหลัง",
    };
  }

  for (let attempt = 0; attempt < MAX_CODE_INSERT_RETRIES; attempt += 1) {
    const code = generateLinkCode();
    const { error } = await supabase.from("line_link_codes").insert({
      code,
      customer_id: customerId,
      expires_at: expiresAt,
    });

    if (!error) {
      return { ok: true, code, deepLink: buildLinkDeepLink(code) };
    }

    // 23505 on the code unique → astronomically rare collision; retry with a
    // fresh code. Any other error is real.
    if (error.code !== "23505") {
      console.error("requestLineLinkCode insert error:", error);
      return {
        ok: false,
        code: "unknown",
        message: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง",
      };
    }
  }

  console.error("requestLineLinkCode: exhausted code-collision retries");
  return {
    ok: false,
    code: "unknown",
    message: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง",
  };
}

/**
 * Build the LINE deep link that opens the OA chat pre-filled with the link
 * command + code, e.g.
 *   https://line.me/R/oaMessage/%40queva/?เชื่อมบัญชี%20LINK-AB23CD45
 */
function buildLinkDeepLink(code: string): string {
  const oaId = getLineOaBasicId(); // e.g. "@queva"
  const text = `${LINK_COMMAND_TEXT} ${code}`;
  return `https://line.me/R/oaMessage/${encodeURIComponent(oaId)}/?${encodeURIComponent(text)}`;
}

// ----- Redeem a code (from the webhook) -----------------------------------

export type RedeemLinkResult =
  | { ok: true; customerId: string }
  | {
      ok: false;
      code: "not_found" | "expired" | "consumed" | "already_linked" | "unknown";
      message: string;
    };

/**
 * Redeem a link code sent from a LINE chat, binding line_user_id to the code's
 * customer. Idempotent under LINE webhook redelivery: re-binding the same
 * userId→customer is a no-op update; the partial-unique index is the backstop
 * if a different customer already claimed this userId (23505 → already_linked).
 */
export async function redeemLineLinkCode(
  code: string,
  lineUserId: string,
): Promise<RedeemLinkResult> {
  const supabase = getSupabaseAdmin();

  const { data: row, error } = await supabase
    .from("line_link_codes")
    .select("id, customer_id, expires_at, consumed_at")
    .eq("code", code)
    .maybeSingle();

  if (error) {
    console.error("redeemLineLinkCode read error:", error);
    return {
      ok: false,
      code: "unknown",
      message: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง",
    };
  }
  if (!row) {
    return {
      ok: false,
      code: "not_found",
      message: "ไม่พบรหัสนี้ กรุณาขอรหัสใหม่จากหน้าโปรไฟล์",
    };
  }
  if (row.consumed_at) {
    return {
      ok: false,
      code: "consumed",
      message: "รหัสนี้ถูกใช้ไปแล้ว กรุณาขอรหัสใหม่",
    };
  }
  if (new Date(row.expires_at as string).getTime() < Date.now()) {
    return {
      ok: false,
      code: "expired",
      message: "รหัสหมดอายุแล้ว กรุณาขอรหัสใหม่จากหน้าโปรไฟล์",
    };
  }

  const customerId = row.customer_id as string;

  // Bind the userId to the customer. Overwrites a prior (different) handle for
  // this customer — re-linking is allowed.
  const { error: bindError } = await supabase
    .from("customers")
    .update({ line_user_id: lineUserId })
    .eq("id", customerId);

  if (bindError) {
    if (bindError.code === "23505") {
      return {
        ok: false,
        code: "already_linked",
        message: "บัญชี LINE นี้ถูกเชื่อมกับผู้ใช้อื่นแล้ว",
      };
    }
    console.error("redeemLineLinkCode bind error:", bindError);
    return {
      ok: false,
      code: "unknown",
      message: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง",
    };
  }

  // Mark consumed (CAS on consumed_at IS NULL so a redelivery can't double-fire
  // downstream side effects; the bind above is already idempotent).
  const { error: consumeError } = await supabase
    .from("line_link_codes")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", row.id as string)
    .is("consumed_at", null);
  if (consumeError) {
    // The bind succeeded — don't fail the user-visible link. The code stays
    // unconsumed but still expires on its own.
    console.error("redeemLineLinkCode consume error:", consumeError);
  }

  return { ok: true, customerId };
}

// ----- Reverse lookup + status + unlink -----------------------------------

/**
 * Find the customer bound to a LINE userId. The outbound-routing seam: the
 * deferred OPP-02 notification sequence / OPP-17 OTP resolve a recipient through
 * here before calling pushLineMessage.
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
