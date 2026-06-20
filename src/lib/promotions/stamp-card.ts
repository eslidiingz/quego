/**
 * Pure, browser-safe stamp-card (บัตรสะสมแต้ม) rules. No `server-only`, no DB —
 * only the tunable constants and the progress math shared by the promotions
 * service, the shop manager UI, and the customer's stamp-card view, so all three
 * agree on "how many stamps does this customer have / can they redeem".
 *
 * Model: a customer's balance for one promotion is the SUM of their
 * `promotion_stamps.amount` rows (earn +1 each, redeem −required_stamps). A
 * reward is redeemable whenever the balance covers another full `required`
 * block, so the same ledger keeps working cycle after cycle without a reset.
 *
 * SRP: the stamp-card *rules*, kept pure so they unit-test without a database
 * and reuse on both sides of the wire.
 */

/** Stamps earned for one completed booking. Flat 1 for now (kept as a const so
 *  the rule can be tuned without touching call sites). */
export const STAMP_PER_COMPLETED_BOOKING = 1;

/** A promotion must require between 1 and 100 stamps (matches the DB CHECK). */
export const MIN_REQUIRED_STAMPS = 1;
export const MAX_REQUIRED_STAMPS = 100;

export type StampProgress = {
  /** Net stamp balance (SUM of ledger amounts), floored at 0 for display. */
  balance: number;
  /** Whole rewards the customer can redeem right now (balance ÷ required). */
  redeemable: number;
  /** Stamps collected toward the NEXT reward, always in [0, required). */
  towardNext: number;
  /** The promotion's required stamp count, echoed (and sanitised) for callers. */
  required: number;
};

/** Clamp an untrusted `required` to a sane positive integer (defaults to 1). */
function sanitiseRequired(required: number): number {
  if (!Number.isFinite(required) || required < 1) return 1;
  return Math.floor(required);
}

/**
 * Turn a raw net balance + the promotion's `required` into display-ready
 * progress. Tolerant of junk input (NaN, negatives, floats): the balance is
 * truncated and floored at 0, `required` falls back to 1.
 */
export function computeStampProgress(
  netAmount: number,
  required: number,
): StampProgress {
  const safeRequired = sanitiseRequired(required);
  const balance = Number.isFinite(netAmount)
    ? Math.max(0, Math.trunc(netAmount))
    : 0;
  return {
    balance,
    redeemable: Math.floor(balance / safeRequired),
    towardNext: balance % safeRequired,
    required: safeRequired,
  };
}

/** True when the balance covers at least one full reward block. */
export function isEligibleToRedeem(
  netAmount: number,
  required: number,
): boolean {
  return computeStampProgress(netAmount, required).redeemable >= 1;
}

/** True when `n` is a valid `required_stamps` value (integer in [1, 100]). */
export function isValidRequiredStamps(n: number): boolean {
  return (
    Number.isInteger(n) && n >= MIN_REQUIRED_STAMPS && n <= MAX_REQUIRED_STAMPS
  );
}
