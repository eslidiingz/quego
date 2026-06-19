/**
 * Derive the public display URL for a stored R2 object KEY.
 *
 * The DB stores only the object key (e.g. `shops/{id}/logo-123.png`), never a
 * full URL — so swapping the public host (the managed r2.dev subdomain ⇄ a
 * custom domain like https://img.quego.app) is a one-env-var change, not a data
 * migration. This is the single place that knows how a key becomes a URL.
 *
 * Pure + browser-safe (NO `server-only`): the value is read from
 * NEXT_PUBLIC_R2_PUBLIC_BASE_URL, which Next inlines into the client bundle, so
 * both server components and client components derive identical URLs. Reading it
 * inside the function (not at module scope) keeps it SSR-safe and testable, and
 * means a missing var yields `null` (→ caller renders its fallback) rather than
 * a broken "/undefined/…" URL.
 */
export function shopImageUrl(key: string | null | undefined): string | null {
  if (!key) return null;
  const base = process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL;
  if (!base) return null;
  return `${base.replace(/\/+$/u, "")}/${key}`;
}
