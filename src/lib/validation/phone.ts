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
