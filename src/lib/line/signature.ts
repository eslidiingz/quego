import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verify a LINE webhook's `x-line-signature`. SRP: pure HMAC verification — no
 * env reads (the channel secret is injected, which also makes it unit-testable
 * with a known vector), no HTTP, no framework types.
 *
 * LINE signs the RAW request body with HMAC-SHA256 keyed by the channel secret,
 * base64-encoded. The caller MUST pass the exact raw body string
 * (`request.text()`), never a re-serialized JSON object — re-serialization
 * changes bytes and breaks the digest. Compared timing-safely so a forged
 * signature can't be probed byte-by-byte. Never throws: any malformed input
 * returns false.
 *
 * Ref: https://developers.line.biz/en/reference/messaging-api/#signature-validation
 */
export function verifyLineSignature(
  rawBody: string,
  signatureHeader: string | null | undefined,
  channelSecret: string,
): boolean {
  if (!signatureHeader) return false;

  let provided: Buffer;
  try {
    provided = Buffer.from(signatureHeader, "base64");
  } catch {
    return false;
  }
  if (provided.length === 0) return false;

  const expected = createHmac("sha256", channelSecret)
    .update(rawBody, "utf8")
    .digest();

  // timingSafeEqual throws if the buffers differ in length — guard first.
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(provided, expected);
}
