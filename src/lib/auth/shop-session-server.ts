import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import {
  SHOP_SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  signShopSessionToken,
  verifyShopSessionToken,
  type ShopSession,
} from "./session";

const LOGIN_INTENT_COOKIE = "lq_shop_login_intent";
const LOGIN_INTENT_TTL_SECONDS = 60 * 10; // 10 minutes

export type ShopLoginIntent = {
  shopId: string;
  phone: string;
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

// ----- Shop session -------------------------------------------------------

export async function createShopSession(session: ShopSession): Promise<void> {
  const token = await signShopSessionToken(session);
  const cookieStore = await cookies();
  cookieStore.set(SHOP_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

/**
 * Mint a shop session on behalf of an admin (impersonation). The session
 * carries an `impersonatedBy` claim so the shop UI can render the banner
 * and route sign-out back to /admin instead of /shop/login.
 *
 * Auth (verifying the caller is an admin and the shop is approved) MUST
 * happen in the server-action layer before calling this — this helper only
 * mints the cookie.
 */
export async function createImpersonationSession(
  session: Omit<ShopSession, "impersonatedBy">,
  adminId: string,
): Promise<void> {
  return createShopSession({ ...session, impersonatedBy: adminId });
}

export async function destroyShopSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SHOP_SESSION_COOKIE);
}

export async function getShopSession(): Promise<ShopSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SHOP_SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifyShopSessionToken(token);
}

export async function requireShopSession(): Promise<ShopSession> {
  const session = await getShopSession();
  if (!session) {
    redirect("/login?tab=shop");
  }
  return session;
}

// ----- Step-1 → step-2 login intent ---------------------------------------
// A short-lived signed cookie that says "this device just verified that
// phone X belongs to shop Y — now collect a PIN". Lives 10 minutes; cleared
// the moment a PIN succeeds (or the user starts a fresh login).

export async function setShopLoginIntent(intent: ShopLoginIntent): Promise<void> {
  const token = await new SignJWT({ ...intent, aud: "shop-login-intent" })
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

export async function getShopLoginIntent(): Promise<ShopLoginIntent | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(LOGIN_INTENT_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      algorithms: ["HS256"],
      audience: "shop-login-intent",
    });
    if (typeof payload.shopId === "string" && typeof payload.phone === "string") {
      return { shopId: payload.shopId, phone: payload.phone };
    }
    return null;
  } catch {
    return null;
  }
}

export async function clearShopLoginIntent(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(LOGIN_INTENT_COOKIE);
}
