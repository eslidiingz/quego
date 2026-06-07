import { randomBytes } from "node:crypto";

/**
 * One-time account-link codes. SRP: the CODE FORMAT only — generating and
 * parsing the "LINK-XXXXXXXX" token. No DB, no env, no HTTP, so it stays pure
 * and unit-testable. The DB binding + TTL live in services/line-linking.ts.
 *
 * The alphabet excludes visually ambiguous characters (0/O/1/I/L) so a customer
 * can read the code off one screen and type it into LINE without confusion.
 */

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0 O 1 I L
const CODE_BODY_LENGTH = 8;

export const LINK_CODE_PREFIX = "LINK-";

/** The Thai command we ask customers to send, e.g. "เชื่อมบัญชี LINK-AB23CD45". */
export const LINK_COMMAND_TEXT = "เชื่อมบัญชี";

// Matches the code anywhere in a message, case-insensitively. Anchored on the
// LINK- prefix so surrounding free text ("เชื่อมบัญชี LINK-AB23CD45 ครับ") still
// parses. The alphabet has no regex-special chars, so interpolation is safe.
const CODE_RE = new RegExp(
  `${LINK_CODE_PREFIX}([${ALPHABET}]{${CODE_BODY_LENGTH}})`,
  "i",
);

/**
 * Generate a fresh "LINK-XXXXXXXX" code with crypto-strong randomness. The
 * modulo introduces a negligible bias that is irrelevant for a single-use code
 * that lives ten minutes — this is not key material.
 */
export function generateLinkCode(): string {
  const bytes = randomBytes(CODE_BODY_LENGTH);
  let body = "";
  for (let i = 0; i < CODE_BODY_LENGTH; i += 1) {
    body += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return `${LINK_CODE_PREFIX}${body}`;
}

/**
 * Extract a normalized (uppercased) link code from arbitrary inbound chat text,
 * or null if none is present. Tolerates surrounding words and lowercase input.
 */
export function parseLinkCommand(text: string): string | null {
  const match = CODE_RE.exec(text);
  if (!match) return null;
  return `${LINK_CODE_PREFIX}${match[1].toUpperCase()}`;
}
