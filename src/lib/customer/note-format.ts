/**
 * Pure, browser-safe validation/format helpers for the CRM-lite customer note
 * (OPP-14). NO `server-only` import here, so both the server service
 * (`customer-notes.ts`) and the client `CustomerNoteForm` can share the SAME
 * length cap + guards without dragging the service-role client into the
 * browser bundle — the same split that keeps `queue-position.ts` pure.
 *
 * Co-located tests live in `src/lib/services/customer-notes.test.ts` (which
 * re-exports these via the service).
 */

import { isValidThaiPhone } from "@/lib/validation/phone";

/** DB CHECK length cap for a note (1..2000). */
export const MAX_NOTE_LENGTH = 2000;

/**
 * Normalise a raw note string for persistence: trim, then collapse an
 * empty/whitespace-only value to `null` (which the writer treats as "clear the
 * note" → DELETE the row).
 */
export function normalizeNote(raw: string | null | undefined): string | null {
  const trimmed = (raw ?? "").trim();
  return trimmed.length === 0 ? null : trimmed;
}

/** Whether a normalised note is within the DB CHECK length cap (1..2000). */
export function isNoteWithinLimit(note: string | null): boolean {
  return note === null || note.length <= MAX_NOTE_LENGTH;
}

/** Phone-shape guard: exactly 10 digits (leading 0), the booking identity key. */
export function isValidCustomerPhone(phone: string): boolean {
  return isValidThaiPhone(phone);
}
