import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { LOCKOUT_DURATION_MINUTES, LOCKOUT_MAX_ATTEMPTS } from "@/lib/auth/lockout";

/**
 * Persistence for the brute-force lockout (SEC-01). SRP: own the *atomic*
 * read/increment/reset of the failed-attempt counter; the policy constants and
 * the user-facing message live in `lockout.ts`, and each caller still does its
 * own "is this account currently locked?" check before verifying the secret.
 *
 * Tables that carry a lock expose a failed-attempt counter plus `locked_until`.
 * The counter column name differs per table, so it travels with the target.
 */
export type LockTarget =
  | { table: "customers"; counter: "failed_pin_attempts" }
  | { table: "shops"; counter: "failed_pin_attempts" }
  | { table: "admins"; counter: "failed_login_attempts" };

const MAX_CAS_RETRIES = 8;

/**
 * Register ONE failed auth attempt atomically and return the resulting lock
 * instant (non-null once the account is locked), or `null` if still unlocked.
 *
 * Why a compare-and-swap loop and NOT read→compute→write: concurrent wrong
 * guesses all read the same stale counter, so a plain "persist attempts+1" lets
 * an attacker fire N guesses in parallel that every write `1` — the lock never
 * trips (TOCTOU; this was the original bug). Instead we UPDATE guarded by
 * `.eq(counter, knownValue)`: exactly one racer's write matches the current
 * value and lands, the losers match zero rows, re-read the now-advanced
 * counter, and retry. Increments therefore serialise under Postgres row locking
 * using only PostgREST filters — no stored procedure or migration required.
 *
 * `knownAttempts` is the counter the caller already SELECTed (used for the first
 * CAS attempt). The caller MUST have checked the lock before calling — this
 * function only ever increments.
 */
export async function registerFailedAttempt(
  target: LockTarget,
  id: string,
  knownAttempts: number,
): Promise<Date | null> {
  const supabase = getSupabaseAdmin();
  let attempts = knownAttempts;

  for (let i = 0; i < MAX_CAS_RETRIES; i++) {
    const next = attempts + 1;
    const justLocked = next >= LOCKOUT_MAX_ATTEMPTS;
    const lockedUntil = justLocked
      ? new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60_000)
      : null;

    const patch: Record<string, unknown> = { [target.counter]: next };
    // Only (re)write locked_until when crossing the threshold; otherwise leave
    // any existing lock untouched.
    if (justLocked) patch.locked_until = lockedUntil!.toISOString();

    const { data, error } = await supabase
      .from(target.table)
      .update(patch)
      .eq("id", id)
      .eq(target.counter, attempts) // compare-and-swap guard
      .select("id");

    if (error) {
      // A transient DB error must not silently drop the lock to "open"; report
      // the lock state we computed for this attempt.
      console.error("registerFailedAttempt error:", error);
      return lockedUntil;
    }

    if (data && data.length > 0) {
      // Our increment landed.
      return justLocked ? lockedUntil : null;
    }

    // CAS lost to a concurrent attempt — re-read the live state and retry.
    const { data: fresh } = await supabase
      .from(target.table)
      .select(`${target.counter}, locked_until`)
      .eq("id", id)
      .maybeSingle();
    if (!fresh) return lockedUntil; // row vanished — best-effort lock
    // `fresh` is a union of the two possible column shapes, so index it through
    // a record cast (the counter key is a trusted constant, not user input).
    const freshRow = fresh as Record<string, number | string | null>;
    const freshLock = freshRow.locked_until
      ? new Date(freshRow.locked_until as string)
      : null;
    if (freshLock && freshLock.getTime() > Date.now()) return freshLock;
    attempts = (freshRow[target.counter] as number | null) ?? 0;
  }

  // Pathological contention — fail safe by locking.
  return new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60_000);
}

/**
 * Clear the failed-attempt counter and any lock after a SUCCESSFUL auth. Safe
 * to run unconditionally — a correct credential means the account is healthy,
 * and concurrent successes all write the same zeroed state.
 */
export async function clearFailedAttempts(
  target: LockTarget,
  id: string,
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from(target.table)
    .update({ [target.counter]: 0, locked_until: null })
    .eq("id", id);
  if (error) console.error("clearFailedAttempts error:", error);
}
