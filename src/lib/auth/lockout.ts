/**
 * Brute-force lockout policy (SEC-01), shared by all three PIN/password flows
 * (shop, customer, admin). After `LOCKOUT_MAX_ATTEMPTS` consecutive failures an
 * account is locked for `LOCKOUT_DURATION_MINUTES`; while locked the secret is
 * never even checked.
 *
 * SRP: this module owns only the lockout *constants* and the user-facing lock
 * message. The per-table read/increment/reset SQL lives in each service because
 * it is table-specific. No server-only deps — these are pure values + a string
 * builder, safe to import anywhere.
 *
 * `locked_until` is an absolute instant (timestamptz), so plain `Date`
 * arithmetic against `new Date()` is correct regardless of host timezone — the
 * Bangkok helpers are for business *calendar dates*, not instant expiry.
 */

export const LOCKOUT_MAX_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MINUTES = 10;

/**
 * Thai message shown when an account is temporarily locked. `N` is the number
 * of whole minutes remaining (rounded up, floored at 1) until `lockedUntil`.
 */
export function lockedMessage(lockedUntil: Date): string {
  const msRemaining = lockedUntil.getTime() - Date.now();
  const minutesRemaining = Math.max(1, Math.ceil(msRemaining / 60_000));
  return `บัญชีถูกล็อกชั่วคราวจากการกรอกผิดหลายครั้ง กรุณาลองใหม่ในอีกประมาณ ${minutesRemaining} นาที`;
}

/**
 * Returns a Thai warning with remaining attempts when `newAttempts` ≥ 3 and
 * the account is not yet locked (< LOCKOUT_MAX_ATTEMPTS). Returns `null` on
 * the first two failures so the UI stays quiet until the user is close to
 * being locked out.
 */
export function remainingAttemptsMessage(newAttempts: number): string | null {
  const remaining = LOCKOUT_MAX_ATTEMPTS - newAttempts;
  if (remaining <= 0 || newAttempts < 3) return null;
  return `เหลืออีก ${remaining} ครั้ง บัญชีจะถูกล็อกชั่วคราว`;
}
