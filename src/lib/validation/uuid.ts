/**
 * Canonical UUID predicate. Pure and browser-safe.
 *
 * A shop's public URL segment may be either a custom handle or its raw UUID
 * (legacy links / QR codes / LINE deep links predate handles). The route
 * resolver branches on this to decide which column to match.
 */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}
