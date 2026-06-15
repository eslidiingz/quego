import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

/**
 * "Phone ownership proven via Firebase OTP" — a short-lived, signed, httpOnly
 * cookie that the SIGNUP actions (customer PIN setup, shop registration) read
 * as the REAL gate before creating an account. The OTP UI ordering is only UX;
 * this cookie is the trust boundary, mirroring the `*-login-intent` cookies
 * (aud-separated off the same ADMIN_SESSION_SECRET, not a separate key).
 */
const PHONE_VERIFIED_COOKIE = "lq_phone_verified";
const PHONE_VERIFIED_TTL_SECONDS = 60 * 15; // 15 minutes
const PHONE_VERIFIED_AUD = "phone-verified";

function getSecret(): Uint8Array {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "ADMIN_SESSION_SECRET must be set to a string of at least 32 chars.",
    );
  }
  return new TextEncoder().encode(secret);
}

/** Record that `phone` was just proven via OTP, for the next ~15 minutes. */
export async function setPhoneVerified(phone: string): Promise<void> {
  const token = await new SignJWT({ phone, aud: PHONE_VERIFIED_AUD })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${PHONE_VERIFIED_TTL_SECONDS}s`)
    .sign(getSecret());

  const cookieStore = await cookies();
  cookieStore.set(PHONE_VERIFIED_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: PHONE_VERIFIED_TTL_SECONDS,
  });
}

/** The phone proven by the most recent OTP, or null if none / expired / forged. */
export async function getVerifiedPhone(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(PHONE_VERIFIED_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      algorithms: ["HS256"],
      audience: PHONE_VERIFIED_AUD,
    });
    return typeof payload.phone === "string" ? payload.phone : null;
  } catch {
    return null;
  }
}

/**
 * Whether THIS exact phone has been proven via OTP in the current window. The
 * hard gate the signup actions call before creating an account — so a user
 * can't verify one number and register another.
 */
export async function isPhoneVerified(phone: string): Promise<boolean> {
  const verified = await getVerifiedPhone();
  return verified !== null && verified === phone;
}

/** Consume the proof (call after a successful signup). */
export async function clearPhoneVerified(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(PHONE_VERIFIED_COOKIE);
}
