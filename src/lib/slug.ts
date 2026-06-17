/**
 * Shop URL "handle" (slug) helpers — pure and browser-safe so the same rules
 * back the registration/profile forms, the shared shop validator, and the
 * server-side route resolver. No `server-only`, no DB.
 *
 * A handle is a shop's public identity in `/shops/{handle}`: lowercase ASCII
 * alphanumerics joined by single hyphens, 3–30 chars, with no leading/trailing
 * or consecutive hyphens, and not a reserved word that would shadow a real
 * route segment.
 *
 * SRP: string shape + predicates only. Thai user-facing messages live in the
 * shop validator (validation/shop.ts); uniqueness + generation live in the
 * service layer (services/shops.ts).
 */

export const HANDLE_MIN_LENGTH = 3;
export const HANDLE_MAX_LENGTH = 30;

/**
 * Words a shop may not claim as a handle. Some collide with real sibling route
 * segments under `/shops/*` (notably `register`); the rest are reserved
 * defensively so handles never read like a system path. Stored lowercase;
 * membership is checked case-insensitively.
 */
export const RESERVED_HANDLES: ReadonlySet<string> = new Set([
  "register",
  "login",
  "logout",
  "signup",
  "sign-up",
  "sign-in",
  "admin",
  "api",
  "me",
  "shop",
  "shops",
  "booking",
  "bookings",
  "account",
  "accounts",
  "settings",
  "profile",
  "search",
  "discover",
  "about",
  "contact",
  "help",
  "support",
  "new",
  "edit",
  "create",
  "static",
  "public",
  "assets",
  "favicon",
  "robots",
  "sitemap",
  "null",
  "undefined",
  "true",
  "false",
]);

const HANDLE_FORMAT_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/u;

/**
 * True when `value` matches the allowed handle SHAPE (length, charset, no
 * leading/trailing or consecutive hyphens). Does NOT check reserved words or
 * uniqueness — compose with {@link isReservedHandle} and a DB lookup.
 */
export function isValidHandleFormat(value: string): boolean {
  if (value.length < HANDLE_MIN_LENGTH || value.length > HANDLE_MAX_LENGTH) {
    return false;
  }
  if (value.includes("--")) return false;
  return HANDLE_FORMAT_RE.test(value);
}

/** True when `value` is a reserved word that may not be used as a handle. */
export function isReservedHandle(value: string): boolean {
  return RESERVED_HANDLES.has(value.toLowerCase());
}

/**
 * Best-effort conversion of free text (e.g. a shop name) into a handle-shaped
 * slug: decompose accents, drop everything outside `[a-z0-9]`, collapse runs to
 * a single hyphen, trim, and cap at {@link HANDLE_MAX_LENGTH}. Returns `""` when
 * nothing usable remains (e.g. a purely Thai name) — callers decide the
 * fallback. The result is not guaranteed to be ≥ the minimum length or
 * non-reserved; validate before persisting.
 */
export function slugify(input: string): string {
  const ascii = input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/gu, "")
    .toLowerCase();
  const hyphenated = ascii
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/-+/gu, "-")
    .replace(/^-+|-+$/gu, "");
  return hyphenated.slice(0, HANDLE_MAX_LENGTH).replace(/-+$/gu, "");
}
