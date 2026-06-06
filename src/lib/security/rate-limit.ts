import "server-only";
import { headers } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * Fixed-window rate limiting, backed by the Postgres `rate_limit_hit` RPC.
 *
 * SRP: a thin "may this request proceed?" gate over the DB function — no HTTP
 * shaping, no Thai copy (callers map a `false` into their own typed result).
 *
 * The RPC atomically increments a per-bucket counter for the current window
 * and returns TRUE while the request is within `limit`, FALSE once the limit
 * is exceeded.
 */

/**
 * Returns `true` if this hit is allowed, `false` if the bucket is over its
 * limit for the current window.
 *
 * FAIL-OPEN by design: a limiter or DB hiccup must never block legitimate
 * users from booking / logging in. So on ANY failure (RPC error or thrown
 * exception) we log the detail server-side and return `true` (allow). The
 * limiter is a defence-in-depth abuse control, not a correctness invariant —
 * the booking write itself still re-validates and the DB exclusion constraint
 * remains the final backstop — so erring toward availability is the right
 * trade-off here.
 */
export async function checkRateLimit(
  bucket: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  try {
    const { data, error } = await getSupabaseAdmin().rpc("rate_limit_hit", {
      p_bucket: bucket,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });

    if (error) {
      console.error("rate_limit_hit RPC error:", error);
      return true; // fail open
    }

    return data === true;
  } catch (err) {
    console.error("checkRateLimit threw:", err);
    return true; // fail open
  }
}

/**
 * Best-effort client IP, used to scope rate-limit buckets.
 *
 * SECURITY: the *leftmost* `x-forwarded-for` entry is whatever the client put
 * there — fully attacker-controlled — so keying a limiter on it lets an
 * attacker evade every cap (fresh forged IP per request) or frame a victim
 * (forge the victim's IP to burn their quota). We therefore trust only values
 * the platform edge itself sets:
 *   1. `x-real-ip` — single value the trusted proxy/edge writes to the true
 *      client IP (Vercel, nginx `proxy_set_header X-Real-IP`, etc.).
 *   2. the *rightmost* `x-forwarded-for` hop — the entry appended by the last
 *      (closest, trusted) proxy, which a client cannot overwrite without
 *      controlling that proxy. Far harder to spoof than the leftmost.
 * Falling back to `"unknown"` collapses header-less requests into one shared
 * bucket rather than throwing.
 *
 * Deployment assumption: the edge MUST set `x-real-ip` (or be the only hop in
 * `x-forwarded-for`) and not pass client-supplied `x-real-ip` through. For the
 * highest-value paths (PIN setup/verify) we additionally key buckets on the
 * phone/shop id, which no header forgery can rotate.
 */
export async function getClientIp(): Promise<string> {
  const h = await headers();

  const realIp = h.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  const forwardedFor = h.get("x-forwarded-for");
  if (forwardedFor) {
    const hops = forwardedFor
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const last = hops[hops.length - 1];
    if (last) return last;
  }

  return "unknown";
}

/**
 * Convenience over {@link checkRateLimit} for guarding one request with several
 * buckets at once (e.g. a coarse per-IP cap AND a tight per-phone cap). Returns
 * `false` (deny) if ANY bucket is over its limit, `true` only if all allow.
 * Buckets are checked sequentially — each still increments its own counter — so
 * keep the list short (auth paths use two).
 */
export async function checkRateLimits(
  buckets: ReadonlyArray<{ bucket: string; limit: number; windowSeconds: number }>,
): Promise<boolean> {
  let allowed = true;
  for (const b of buckets) {
    // Don't short-circuit: we want every bucket's window to count this hit so a
    // partial trip still records the attempt across all dimensions.
    if (!(await checkRateLimit(b.bucket, b.limit, b.windowSeconds))) {
      allowed = false;
    }
  }
  return allowed;
}
