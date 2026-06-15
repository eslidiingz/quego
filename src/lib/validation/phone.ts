/**
 * Canonical phone-number validator — the SINGLE source of truth for "what
 * counts as a valid phone" across every persona and flow (customer/shop/admin
 * login, booking, shop registration, waitlist, staff, customer notes, …).
 *
 * Rule: EXACTLY 10 digits, leading "0" (Thai mobile/landline shape). This is
 * the same value `PhoneInput` produces — it strips non-digits, caps at 10, and
 * auto-prepends "0" — so a field's contents either match this or are still
 * being typed. Anything shorter/longer (or without the leading 0) is rejected,
 * so no flow can submit a half-typed number.
 *
 * Pure module (no `server-only`, no DB): imported by client components, server
 * actions, and the service layer alike so the rule can never drift between the
 * UX gate and the server backstop — the same client+server split that keeps
 * `slot-math.ts` honest.
 */

/** Required phone length, in digits. */
export const PHONE_DIGITS = 10;

/** Exactly 10 digits, leading 0. */
export const THAI_PHONE_RE = /^0\d{9}$/u;

/** Standard Thai inline error for an invalid phone (10 digits, leading 0). */
export const PHONE_ERROR_MESSAGE = "เบอร์โทรไม่ถูกต้อง (10 หลัก ขึ้นต้นด้วย 0)";

/** Whether a string is a valid phone: exactly 10 digits starting with 0. */
export function isValidThaiPhone(phone: string): boolean {
  return THAI_PHONE_RE.test(phone);
}

/** Thai country calling code, E.164 form. */
export const THAI_COUNTRY_CODE = "+66";

/**
 * Canonical Thai phone (10 digits, leading 0) → E.164 (`+66…`) for Firebase
 * Phone Auth, which only accepts E.164. Returns null for anything that isn't a
 * valid local phone, so a half-typed number can never be sent to the SMS API.
 */
export function toE164Thai(phone: string): string | null {
  if (!isValidThaiPhone(phone)) return null;
  return `${THAI_COUNTRY_CODE}${phone.slice(1)}`;
}

/**
 * E.164 Thai number (`+66XXXXXXXXX`) → canonical 10-digit, leading-0 form used
 * everywhere else (DB keys, sessions, comparisons). Returns null unless it maps
 * back to a valid local phone — so a token carrying a non-Thai number can never
 * masquerade as a local one.
 */
export function fromE164Thai(e164: string): string | null {
  if (!e164.startsWith(THAI_COUNTRY_CODE)) return null;
  const local = `0${e164.slice(THAI_COUNTRY_CODE.length)}`;
  return isValidThaiPhone(local) ? local : null;
}
