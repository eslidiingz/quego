import "server-only";
import {
  initializeApp,
  getApps,
  getApp,
  cert,
  type App,
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { fromE164Thai } from "@/lib/validation/phone";

/**
 * Server-side Firebase Admin — the trust boundary for Phone Auth. The browser
 * does the SMS + reCAPTCHA + code-confirm dance and hands us a Firebase ID
 * token; ONLY this module (via the Admin SDK) can decide whether that token is
 * genuine and which phone it proves. Never trust a client's "I'm verified".
 *
 * Credentials come from a service-account JSON kept server-only in
 * FIREBASE_SERVICE_ACCOUNT_KEY (base64-encoded for a single-line .env value;
 * raw JSON also accepted). No NEXT_PUBLIC_ prefix — it must never reach the
 * browser bundle.
 */
function loadServiceAccount(): {
  projectId: string;
  clientEmail: string;
  privateKey: string;
} {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.trim();
  if (!raw) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_KEY is not set. Provide the Firebase service-account JSON (base64-encoded), server-only.",
    );
  }
  const json = raw.startsWith("{")
    ? raw
    : Buffer.from(raw, "base64").toString("utf8");
  const parsed = JSON.parse(json) as {
    project_id?: string;
    client_email?: string;
    private_key?: string;
  };
  if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_KEY is missing project_id / client_email / private_key.",
    );
  }
  return {
    projectId: parsed.project_id,
    clientEmail: parsed.client_email,
    privateKey: parsed.private_key,
  };
}

function getAdminApp(): App {
  if (getApps().length) return getApp();
  const sa = loadServiceAccount();
  return initializeApp({
    credential: cert({
      projectId: sa.projectId,
      clientEmail: sa.clientEmail,
      privateKey: sa.privateKey,
    }),
  });
}

export type VerifiedPhone = { phone: string; firebaseUid: string };

/**
 * Verify a Firebase ID token from the browser Phone Auth flow and extract the
 * PROVEN phone number, normalized to the canonical Thai 10-digit / leading-0
 * form used everywhere else. Returns null on ANY failure (bad/expired token,
 * missing phone claim, non-Thai number) — callers treat null as "not verified"
 * and must never create an account.
 */
export async function verifyFirebaseIdToken(
  idToken: string,
): Promise<VerifiedPhone | null> {
  try {
    const decoded = await getAuth(getAdminApp()).verifyIdToken(idToken);
    if (typeof decoded.phone_number !== "string") return null;
    const phone = fromE164Thai(decoded.phone_number);
    if (!phone) return null;
    return { phone, firebaseUid: decoded.uid };
  } catch (err) {
    console.error("verifyFirebaseIdToken failed:", err);
    return null;
  }
}
