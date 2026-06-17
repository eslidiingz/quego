import "server-only";
import { jwtVerify, createRemoteJWKSet, type JWTVerifyGetKey } from "jose";
import { fromE164Thai } from "@/lib/validation/phone";

/**
 * Server-side trust boundary for Firebase Phone Auth. The browser runs the SMS
 * + reCAPTCHA + code-confirm dance and hands us a Firebase ID token; this module
 * decides whether that token is genuine and which phone it proves. Never trust a
 * client's "I'm verified".
 *
 * A Firebase ID token is just a standard RS256 JWT signed by Google, so we
 * verify it the way every other JWT in this app is handled — with `jose` —
 * against Google's PUBLIC signing keys. No Firebase Admin SDK, no service-account
 * secret: the Admin SDK is a heavy gRPC/native dependency that does NOT survive
 * the Turbopack serverless build (it fails at runtime with "Failed to load
 * external module firebase-admin"), and all it ever did here was verify one
 * token. Public-key verification is exactly what Google documents for third-party
 * JWT libraries: https://firebase.google.com/docs/auth/admin/verify-id-tokens
 */

/** Google's public JWK set for Firebase Secure Token (Phone Auth) signatures. */
const SECURE_TOKEN_JWK_SET_URL =
  "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";

/**
 * Cached remote key set. `createRemoteJWKSet` fetches Google's keys on first
 * use, honours their `Cache-Control` max-age, and refetches automatically on key
 * rotation (unknown `kid`). Module-level so a warm serverless instance reuses
 * the keys instead of refetching per verification.
 */
let cachedKeySet: JWTVerifyGetKey | null = null;
function googleSecureTokenKeys(): JWTVerifyGetKey {
  cachedKeySet ??= createRemoteJWKSet(new URL(SECURE_TOKEN_JWK_SET_URL));
  return cachedKeySet;
}

/**
 * The Firebase project id — the token's required `aud`, and embedded in its
 * required `iss`. It is public (it ships in the browser bundle as
 * `NEXT_PUBLIC_FIREBASE_PROJECT_ID`), so reusing it server-side is safe: the
 * RS256 signature is what proves the token is genuine; the project id only
 * proves it was minted for THIS project and not some attacker's.
 */
function firebaseProjectId(): string {
  const id = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();
  if (!id) {
    throw new Error(
      "NEXT_PUBLIC_FIREBASE_PROJECT_ID is not set — cannot verify Firebase ID tokens.",
    );
  }
  return id;
}

export type VerifiedPhone = { phone: string; firebaseUid: string };

/**
 * Verify a Firebase ID token from the browser Phone Auth flow and extract the
 * PROVEN phone number, normalized to the canonical Thai 10-digit / leading-0
 * form used everywhere else. Returns null on ANY failure (bad/expired/forged
 * token, wrong project, missing phone claim, non-Thai number) — callers treat
 * null as "not verified" and must never create an account.
 *
 * `keySet` is injectable so tests can verify against a locally-generated key
 * pair; production always uses Google's cached remote keys.
 */
export async function verifyFirebaseIdToken(
  idToken: string,
  keySet: JWTVerifyGetKey = googleSecureTokenKeys(),
): Promise<VerifiedPhone | null> {
  try {
    const projectId = firebaseProjectId();
    const { payload } = await jwtVerify(idToken, keySet, {
      algorithms: ["RS256"],
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
    });
    // `sub` is the Firebase uid and MUST be a non-empty string (Google's spec).
    if (typeof payload.sub !== "string" || payload.sub.length === 0) return null;
    if (typeof payload.phone_number !== "string") return null;
    const phone = fromE164Thai(payload.phone_number);
    if (!phone) return null;
    return { phone, firebaseUid: payload.sub };
  } catch (err) {
    console.error("verifyFirebaseIdToken failed:", err);
    return null;
  }
}
