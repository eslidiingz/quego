/**
 * Pure, browser-safe loyalty + referral rules. No `server-only`, no DB, no
 * `node:crypto` — this module holds ONLY the tunable constants and the
 * normalize / shape-validation helpers shared by the service and any client
 * code. Random referral-code GENERATION lives in the service (it needs
 * `node:crypto`); this file only decides what a valid code looks like.
 *
 * SRP: the loyalty point/referral *rules*, kept pure so they can be unit-tested
 * without a database and reused on both sides of the wire.
 */

/**
 * Points credited for one completed booking. Loyalty is purely INFORMATIONAL
 * ("แต้ม") with no redemption rail, so the credit is price-independent — a flat
 * 1 point per completed booking for now. Kept as a function (not a bare const)
 * so the rule can be tuned later without touching every call site.
 */
export function creditForCompletedBooking(_price: number | null): number {
  return 1;
}

/** Points awarded to the REFERRER (only) once a referral is released. */
export const REFERRAL_REWARD_POINTS = 5;

/** Days a referral is held before its reward can be released. */
export const REFERRAL_HOLD_DAYS = 3;

/**
 * Number of characters in a generated referral code. The generator (service)
 * draws from this same alphabet; `isValidReferralCodeShape` accepts this length.
 */
export const REFERRAL_CODE_LENGTH = 8;

/**
 * Alphabet for generated codes: uppercase A–Z + digits 2–9, with the
 * ambiguous glyphs (0/O, 1/I) removed so a code is unambiguous when read aloud
 * or typed from a poster. `isValidReferralCodeShape` validates against exactly
 * this set.
 */
export const REFERRAL_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const REFERRAL_CODE_SHAPE_RE = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]+$/u;
/** Lower bound is generous so links shared before this build still validate. */
const MIN_REFERRAL_CODE_LENGTH = 4;
const MAX_REFERRAL_CODE_LENGTH = 32;

/**
 * Canonicalize a referral code from untrusted input (a `?ref=` query param):
 * strip all whitespace and uppercase it. Anything non-string collapses to "".
 * This is the single normalization both link-generation and link-consumption
 * pass through, so a code always compares equal regardless of how it was typed.
 */
export function normalizeReferralCode(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw.replace(/\s+/gu, "").toUpperCase();
}

/**
 * True when `code` is already in canonical shape: only alphabet characters and
 * within the accepted length band. Callers should `normalizeReferralCode`
 * first — this does NOT normalize, so a lowercase or padded value returns false.
 */
export function isValidReferralCodeShape(code: string): boolean {
  if (typeof code !== "string") return false;
  if (
    code.length < MIN_REFERRAL_CODE_LENGTH ||
    code.length > MAX_REFERRAL_CODE_LENGTH
  ) {
    return false;
  }
  return REFERRAL_CODE_SHAPE_RE.test(code);
}
