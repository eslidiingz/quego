import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import {
  CUSTOMER_SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  signCustomerSessionToken,
  verifyCustomerSessionToken,
  type CustomerSession,
} from "./session";

const LOGIN_INTENT_COOKIE = "lq_customer_login_intent";
const LOGIN_INTENT_TTL_SECONDS = 60 * 10; // 10 minutes

export type CustomerLoginIntent = {
  phone: string;
  /**
   * Optional referral code the customer arrived with (`?ref=` on /login).
   * Carried through to PIN setup so a new customer's referral can be recorded
   * once their account is created. Additive — older intent cookies without it
   * decode fine (the field is simply absent).
   */
  referralCode?: string;
};

function getSecret(): Uint8Array {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "ADMIN_SESSION_SECRET must be set to a string of at least 32 chars.",
    );
  }
  return new TextEncoder().encode(secret);
}

// ----- Customer session ---------------------------------------------------

export async function createCustomerSession(
  session: CustomerSession,
): Promise<void> {
  const token = await signCustomerSessionToken(session);
  const cookieStore = await cookies();
  cookieStore.set(CUSTOMER_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function destroyCustomerSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(CUSTOMER_SESSION_COOKIE);
}

export async function getCustomerSession(): Promise<CustomerSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(CUSTOMER_SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifyCustomerSessionToken(token);
}

export async function requireCustomerSession(): Promise<CustomerSession> {
  const session = await getCustomerSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}

// ----- Step-1 → step-2 login intent ---------------------------------------
// Mirrors the shop-side intent: step 1 captures the phone, step 2 reads
// the cookie + decides setup vs verify. Lives 10 minutes.

export async function setCustomerLoginIntent(
  intent: CustomerLoginIntent,
): Promise<void> {
  const token = await new SignJWT({ ...intent, aud: "customer-login-intent" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${LOGIN_INTENT_TTL_SECONDS}s`)
    .sign(getSecret());

  const cookieStore = await cookies();
  cookieStore.set(LOGIN_INTENT_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: LOGIN_INTENT_TTL_SECONDS,
  });
}

export async function getCustomerLoginIntent(): Promise<CustomerLoginIntent | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(LOGIN_INTENT_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      algorithms: ["HS256"],
      audience: "customer-login-intent",
    });
    if (typeof payload.phone === "string") {
      const referralCode =
        typeof payload.referralCode === "string"
          ? payload.referralCode
          : undefined;
      return { phone: payload.phone, referralCode };
    }
    return null;
  } catch {
    return null;
  }
}

export async function clearCustomerLoginIntent(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(LOGIN_INTENT_COOKIE);
}
