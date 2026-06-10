import "server-only";
import { randomInt } from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  creditForCompletedBooking,
  isValidReferralCodeShape,
  normalizeReferralCode,
  REFERRAL_CODE_ALPHABET,
  REFERRAL_CODE_LENGTH,
  REFERRAL_HOLD_DAYS,
  REFERRAL_REWARD_POINTS,
} from "@/lib/loyalty/loyalty-credit";

/**
 * Loyalty + referral service. Like every other service here, all DB access
 * goes through the service-role client (RLS deny-all), so every authorization
 * decision lives in application code — the customer's `phone` MUST come from
 * the verified session, never request input. It is the customer identity key,
 * so loyalty and referrals are keyed by phone (matching `bookings.customer_phone`).
 *
 * Loyalty is purely INFORMATIONAL ("แต้ม") — there is no redemption rail.
 *
 * Accrual: a flat 1 point per completed booking (idempotent via
 * `UNIQUE(booking_id, kind)`). Referral: the REFERRER earns
 * REFERRAL_REWARD_POINTS once the referral's hold passes AND the referee has
 * actually used the service (≥1 completed booking). Release is LAZY — there is
 * no cron; every loyalty read first promotes any now-eligible held referrals.
 */

// ----- Types --------------------------------------------------------------

export type LedgerKind = "earn" | "referral" | "adjust";

export type LedgerEntry = {
  id: string;
  kind: LedgerKind;
  amount: number;
  note: string | null;
  createdAt: string; // ISO timestamp (created_at)
};

export type LoyaltyBalance = { balance: number };

export type AccrueCreditResult =
  | { ok: true }
  | { ok: false; code: "no_phone" | "unknown"; message: string };

// ----- Internal row shapes -----------------------------------------------

type LedgerRow = {
  id: string;
  kind: LedgerKind;
  amount: number;
  note: string | null;
  created_at: string;
};

type AmountRow = { amount: number };

type ReferralRow = {
  id: string;
  referrer_phone: string;
  referee_phone: string;
};

const UNKNOWN_MESSAGE = "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง";
const CODE_COLLISION_RETRIES = 5;

// ----- Code generation (impure: node:crypto) ------------------------------

/**
 * Generate a random, unambiguous referral code from the shared alphabet using a
 * CSPRNG. Generation lives here (not in the pure module) because it needs
 * `node:crypto`; the shape/normalize rules it must satisfy stay pure.
 */
function generateReferralCode(): string {
  let out = "";
  for (let i = 0; i < REFERRAL_CODE_LENGTH; i += 1) {
    out += REFERRAL_CODE_ALPHABET[randomInt(REFERRAL_CODE_ALPHABET.length)];
  }
  return out;
}

// ----- Read: balance + history (release-on-read) --------------------------

/**
 * The customer's current point balance (SUM of every ledger amount). Releases
 * any now-eligible held referrals FIRST so the balance reflects rewards the
 * customer has just earned, without needing a background job.
 */
export async function getLoyaltyBalance(
  phone: string,
): Promise<LoyaltyBalance> {
  await releaseEligibleReferrals(phone);

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("loyalty_ledger")
    .select("amount")
    .eq("customer_phone", phone);

  if (error || !data) {
    if (error) console.error("getLoyaltyBalance error:", error);
    return { balance: 0 };
  }

  const balance = (data as unknown as AmountRow[]).reduce(
    (acc, r) => acc + r.amount,
    0,
  );
  return { balance };
}

/**
 * The customer's full ledger, newest-first. Releases eligible referrals first
 * (same reason as the balance) so a freshly-earned referral row appears at top.
 * Degrades to an empty list on any infra error rather than throwing.
 */
export async function listLoyaltyLedger(
  phone: string,
): Promise<LedgerEntry[]> {
  await releaseEligibleReferrals(phone);

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("loyalty_ledger")
    .select("id, kind, amount, note, created_at")
    .eq("customer_phone", phone)
    .order("created_at", { ascending: false });

  if (error || !data) {
    if (error) console.error("listLoyaltyLedger error:", error);
    return [];
  }

  return (data as unknown as LedgerRow[]).map((r) => ({
    id: r.id,
    kind: r.kind,
    amount: r.amount,
    note: r.note,
    createdAt: r.created_at,
  }));
}

// ----- Write: accrual on completed booking --------------------------------

/**
 * Credit a customer for one completed booking. Idempotent: the
 * `UNIQUE(booking_id, kind)` index means a duplicate insert (e.g. a booking
 * toggled completed twice) collapses to a no-op (Postgres `23505`). Only runs
 * when `phone` is non-null — anonymous bookings have no loyalty identity.
 *
 * Called from the booking-status transition off the response path (`after`),
 * so it must never throw: every failure resolves to a typed result.
 */
export async function accrueBookingCredit(
  bookingId: string,
  phone: string | null,
  servicePrice: number | null,
): Promise<AccrueCreditResult> {
  if (!phone) {
    return {
      ok: false,
      code: "no_phone",
      message: "การจองนี้ไม่มีเบอร์โทรที่ผูกกับบัญชี",
    };
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("loyalty_ledger").insert({
    customer_phone: phone,
    kind: "earn",
    amount: creditForCompletedBooking(servicePrice),
    booking_id: bookingId,
    note: "ใช้บริการเสร็จสิ้น",
  });

  if (error) {
    // UNIQUE(booking_id, kind) → already credited for this booking. No-op.
    if (error.code === "23505") return { ok: true };
    console.error("accrueBookingCredit insert error:", error);
    return { ok: false, code: "unknown", message: UNKNOWN_MESSAGE };
  }

  return { ok: true };
}

// ----- Referral code (lazy, stable per customer) --------------------------

/**
 * Read this customer's stable referral code, generating + persisting one on
 * first use. The code is stored on `customers.referral_code` (partial-unique),
 * so it never changes once set. On a `23505` collision with another customer's
 * code we retry with a fresh random code a bounded number of times.
 *
 * `phone` MUST come from the verified session — it scopes the read/write to the
 * caller's own row.
 */
export async function getOrCreateReferralCode(phone: string): Promise<string> {
  const supabase = getSupabaseAdmin();

  const { data: existing, error: readError } = await supabase
    .from("customers")
    .select("referral_code")
    .eq("phone", phone)
    .maybeSingle();

  if (readError) {
    console.error("getOrCreateReferralCode read error:", readError);
    return "";
  }
  const current = (existing?.referral_code as string | null) ?? null;
  if (current) return current;

  for (let attempt = 0; attempt < CODE_COLLISION_RETRIES; attempt += 1) {
    const code = normalizeReferralCode(generateReferralCode());
    const { data, error } = await supabase
      .from("customers")
      .update({ referral_code: code })
      .eq("phone", phone)
      .is("referral_code", null) // don't clobber a code set by a concurrent call
      .select("referral_code")
      .maybeSingle();

    if (!error && data) return (data.referral_code as string | null) ?? code;

    // A concurrent call already set our code → re-read and return it.
    if (!error && !data) {
      const { data: reread } = await supabase
        .from("customers")
        .select("referral_code")
        .eq("phone", phone)
        .maybeSingle();
      const fresh = (reread?.referral_code as string | null) ?? null;
      if (fresh) return fresh;
      continue;
    }

    // 23505 = the generated code collided with another customer's. Retry.
    // (`error` is non-null here — both no-error branches above returned/continued —
    // but optional-chain it so the compiler can prove it too.)
    if (error?.code === "23505") continue;

    console.error("getOrCreateReferralCode update error:", error);
    return "";
  }

  return "";
}

// ----- Referral creation (at referee's first PIN setup) -------------------

/**
 * Best-effort: when a new customer finishes PIN setup having arrived via a
 * referral link, create the held referral row. Resolves the code → referrer's
 * phone, guards self-referral, and inserts a `held` row whose `hold_until` is
 * REFERRAL_HOLD_DAYS from NOW in Bangkok time. The `UNIQUE(referee_phone)`
 * index means a customer can only ever be referred once — a duplicate insert
 * (`23505`) is swallowed.
 *
 * Never throws and returns nothing: a referral failing to record must not block
 * account creation. The caller invokes this and ignores the outcome.
 */
export async function ensureReferralForNewCustomer(
  refereePhone: string,
  referralCode: string,
): Promise<void> {
  const code = normalizeReferralCode(referralCode);
  if (!isValidReferralCodeShape(code)) return;

  const supabase = getSupabaseAdmin();

  const { data: referrer, error: lookupError } = await supabase
    .from("customers")
    .select("phone")
    .eq("referral_code", code)
    .maybeSingle();

  if (lookupError) {
    console.error("ensureReferralForNewCustomer lookup error:", lookupError);
    return;
  }
  const referrerPhone = (referrer?.phone as string | null) ?? null;
  // Unknown code or self-referral → nothing to record.
  if (!referrerPhone || referrerPhone === refereePhone) return;

  // hold_until = the current instant + REFERRAL_HOLD_DAYS. Both this value and
  // the release cutoff are absolute UTC instants (timestamptz); adding whole
  // 24h blocks is timezone-agnostic at the instant level, so no ICT projection
  // is needed here (unlike calendar-day logic, which must use bangkok.ts).
  const holdUntil = new Date(
    Date.now() + REFERRAL_HOLD_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { error: insertError } = await supabase.from("referrals").insert({
    referrer_phone: referrerPhone,
    referee_phone: refereePhone,
    referral_code: code,
    status: "held",
    hold_until: holdUntil,
  });

  if (insertError) {
    // UNIQUE(referee_phone) → already referred once. Swallow.
    if (insertError.code === "23505") return;
    console.error("ensureReferralForNewCustomer insert error:", insertError);
  }
}

// ----- Lazy release (no cron) ---------------------------------------------

/**
 * Promote this customer's `held` referrals (as the REFERRER) to `released`
 * when both conditions hold: the hold window has passed AND the referee has at
 * least one completed booking (they actually used the service). For each, we
 * insert the referrer's `referral` ledger row — idempotent via
 * `UNIQUE(referral_id)` (`23505` → already rewarded) — then mark the referral
 * released. Anchors "now" on the Bangkok clock.
 *
 * Called at the top of every loyalty read so rewards land without a background
 * job. Best-effort: any infra error is logged and skipped, never thrown.
 */
export async function releaseEligibleReferrals(phone: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  // Eligibility cutoff is the current absolute instant; `hold_until` was stored
  // the same way (timestamptz), so the comparison needs no ICT projection.
  const nowIso = new Date().toISOString();

  const { data: held, error: heldError } = await supabase
    .from("referrals")
    .select("id, referrer_phone, referee_phone")
    .eq("referrer_phone", phone)
    .eq("status", "held")
    .lte("hold_until", nowIso);

  if (heldError) {
    console.error("releaseEligibleReferrals read error:", heldError);
    return;
  }
  const rows = (held as unknown as ReferralRow[] | null) ?? [];
  if (rows.length === 0) return;

  for (const referral of rows) {
    // Gate on the referee having actually used the service: ≥1 completed booking.
    const { data: completed, error: completedError } = await supabase
      .from("bookings")
      .select("id")
      .eq("customer_phone", referral.referee_phone)
      .eq("status", "completed")
      .limit(1)
      .maybeSingle();

    if (completedError) {
      console.error(
        "releaseEligibleReferrals completed-check error:",
        completedError,
      );
      continue;
    }
    if (!completed) continue; // referee hasn't used the service yet — keep held.

    // Reward the referrer. UNIQUE(referral_id) makes this idempotent.
    const { error: ledgerError } = await supabase
      .from("loyalty_ledger")
      .insert({
        customer_phone: referral.referrer_phone,
        kind: "referral",
        amount: REFERRAL_REWARD_POINTS,
        referral_id: referral.id,
        note: "เพื่อนที่คุณแนะนำใช้บริการแล้ว",
      });

    if (ledgerError && ledgerError.code !== "23505") {
      console.error("releaseEligibleReferrals ledger error:", ledgerError);
      continue; // leave held; we'll retry on a later read.
    }

    const { error: updateError } = await supabase
      .from("referrals")
      .update({ status: "released", released_at: nowIso })
      .eq("id", referral.id)
      .eq("status", "held");

    if (updateError) {
      console.error("releaseEligibleReferrals update error:", updateError);
    }
  }
}
