import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import { verifyLineSignature } from "@/lib/line/signature";

// Known vector: HMAC-SHA256 over the raw body, base64, keyed by the secret.
const SECRET = "test-channel-secret";
const BODY = JSON.stringify({ destination: "U0000", events: [] });
const VALID_SIG = createHmac("sha256", SECRET)
  .update(BODY, "utf8")
  .digest("base64");

describe("verifyLineSignature", () => {
  it("accepts a correct signature (known vector)", () => {
    expect(verifyLineSignature(BODY, VALID_SIG, SECRET)).toBe(true);
  });

  it("rejects a tampered body", () => {
    expect(verifyLineSignature(`${BODY} `, VALID_SIG, SECRET)).toBe(false);
  });

  it("rejects a tampered signature", () => {
    const flipped = (VALID_SIG[0] === "A" ? "B" : "A") + VALID_SIG.slice(1);
    expect(verifyLineSignature(BODY, flipped, SECRET)).toBe(false);
  });

  it("rejects the wrong secret", () => {
    expect(verifyLineSignature(BODY, VALID_SIG, "wrong-secret")).toBe(false);
  });

  it("returns false (never throws) for a missing/empty header", () => {
    expect(verifyLineSignature(BODY, null, SECRET)).toBe(false);
    expect(verifyLineSignature(BODY, undefined, SECRET)).toBe(false);
    expect(verifyLineSignature(BODY, "", SECRET)).toBe(false);
  });

  it("returns false for a malformed (wrong-length) signature", () => {
    expect(verifyLineSignature(BODY, "deadbeef", SECRET)).toBe(false);
  });
});
