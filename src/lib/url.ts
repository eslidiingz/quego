/**
 * Canonical origin + absolute-URL helpers for building shareable links
 * (QR codes, the link a shop pastes into its LINE OA rich menu).
 *
 * Server + client safe: `NEXT_PUBLIC_SITE_URL` is inlined into the browser
 * bundle at build time, so the same helper works in an RSC and in client code.
 * In practice the share page resolves these on the server and passes the
 * finished strings to the client.
 *
 * SRP: turn config + a path into a fully-qualified URL — nothing else.
 */

const DEV_FALLBACK = "http://localhost:4000";

function stripTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

/**
 * Ensure an origin has an explicit scheme. A value like `queva.app` (a common
 * misconfiguration of NEXT_PUBLIC_SITE_URL) would otherwise produce a broken
 * relative-looking URL — and a wrong QR code — with no error. Default to https.
 */
function ensureScheme(value: string): string {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

/**
 * The app's canonical origin (no trailing slash). Resolution order:
 *   1. NEXT_PUBLIC_SITE_URL — explicit, set in production.
 *   2. VERCEL_URL — auto-provided on Vercel (server-only; host without scheme).
 *   3. http://localhost:4000 — local dev (matches the `pnpm dev` port).
 */
export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return ensureScheme(stripTrailingSlash(explicit));

  const vercel =
    process.env.NEXT_PUBLIC_VERCEL_URL?.trim() || process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${stripTrailingSlash(vercel)}`;

  return DEV_FALLBACK;
}

/** Join the canonical origin with `path` (leading slash optional). */
export function absoluteUrl(path: string): string {
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${getSiteUrl()}${suffix}`;
}
