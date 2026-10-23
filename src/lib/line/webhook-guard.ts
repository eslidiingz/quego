/**
 * Pure replay guards for inbound LINE webhook events. NO `server-only` import so
 * the decisions are unit-testable; the dedupe INSERT lives in services/line-log.
 *
 * The HMAC signature proves a body came from LINE but not that it is fresh: a
 * captured valid body can be re-POSTed forever. Two cheap checks close that:
 *  - reject events whose `timestamp` is older than MAX_EVENT_AGE_MS;
 *  - drop a `webhookEventId` we have already processed (insert-first dedupe).
 */

/** LINE retries redeliveries within minutes; anything older is a replay. */
export const MAX_EVENT_AGE_MS = 5 * 60 * 1000;

/** Tolerated clock skew for events stamped slightly in the future. */
export const MAX_EVENT_FUTURE_SKEW_MS = 60 * 1000;

/**
 * True when the event must be ignored as stale. A missing/non-numeric timestamp
 * is treated as stale: genuine LINE events always carry one.
 */
export function isStaleLineEvent(
  timestamp: unknown,
  nowMs: number = Date.now(),
): boolean {
  if (typeof timestamp !== "number" || !Number.isFinite(timestamp)) return true;
  const age = nowMs - timestamp;
  return age > MAX_EVENT_AGE_MS || age < -MAX_EVENT_FUTURE_SKEW_MS;
}

/** The webhook event id used as the dedupe key, or null when absent. */
export function webhookEventKey(webhookEventId: unknown): string | null {
  return typeof webhookEventId === "string" && webhookEventId.length > 0
    ? `evt:${webhookEventId.slice(0, 64)}`
    : null;
}
