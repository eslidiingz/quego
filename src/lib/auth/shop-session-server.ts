import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { fetchSessionVersion, readSessionVersion } from "./session-version";
import {
  IMPERSONATION_TTL_SECONDS,
  isSessionVersionCurrent,
  SHOP_DISPLAY_COOKIE,
  SHOP_DISPLAY_TTL_SECONDS,
  SHOP_SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  signShopDisplayToken,
  verifyShopDisplayToken,
  type ShopDisplaySession,
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

/**
 * Mint the shop session cookie. The token is stamped with the shop's current
 * `session_version` read here, so callers never pass it (audit M7).
 */
export async function createShopSession(
  session: ShopSession,
  ttlSeconds: number = SESSION_TTL_SECONDS,
): Promise<void> {
  const sessionVersion = (await fetchSessionVersion("shops", session.shopId)) ?? 1;
  const token = await signShopSessionToken({ ...session, sessionVersion }, ttlSeconds);
  const cookieStore = await cookies();
  cookieStore.set(SHOP_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ttlSeconds,
  });
}

/**
 * Mint a shop session on behalf of an admin (impersonation). Lives 2 hours,
 * not the normal 8 (audit M7, user decision). The session
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
  return createShopSession(
    { ...session, impersonatedBy: adminId },
    IMPERSONATION_TTL_SECONDS,
  );
}

export async function destroyShopSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SHOP_SESSION_COOKIE);
}

export async function getShopSession(): Promise<ShopSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SHOP_SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await verifyShopSessionToken(token);
  if (!session) return null;
  const dbVersion = await readSessionVersion("shops", session.shopId);
  return isSessionVersionCurrent(session.sessionVersion ?? 1, dbVersion)
    ? session
    : null;
}

async function hasSessionCookie(): Promise<boolean> {
  return Boolean((await cookies()).get(SHOP_SESSION_COOKIE)?.value);
}

export async function requireShopSession(): Promise<ShopSession> {
  const session = await getShopSession();
  if (!session) {
    // A cookie that still parses but no longer matches the DB version was
    // revoked; clear it via the route handler (Server Components can't).
    redirect(
      (await hasSessionCookie())
        ? "/api/auth/session-revoked?p=shop"
        : "/login?tab=shop",
    );
  }
  return session;
}

// ----- Kiosk display session ---------------------------------------------
// Scoped to the /shop/display path so the browser never even sends it to the
// owner area; the owner session itself is removed when display mode starts.

export const SHOP_DISPLAY_PATH = "/shop/display";

export async function createShopDisplaySession(
  session: ShopDisplaySession,
): Promise<void> {
  const token = await signShopDisplayToken(session);
  const cookieStore = await cookies();
  cookieStore.set(SHOP_DISPLAY_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: SHOP_DISPLAY_PATH,
    maxAge: SHOP_DISPLAY_TTL_SECONDS,
  });
}

export async function getShopDisplaySession(): Promise<ShopDisplaySession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SHOP_DISPLAY_COOKIE)?.value;
  if (!token) return null;
  return verifyShopDisplayToken(token);
}

/** For kiosk server actions: the display token is the only accepted proof. */
export async function requireShopDisplaySession(): Promise<ShopDisplaySession> {
  const session = await getShopDisplaySession();
  if (!session) {
    redirect("/login?tab=shop");
  }
  return session;
}

export async function destroyShopDisplaySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete({ name: SHOP_DISPLAY_COOKIE, path: SHOP_DISPLAY_PATH });
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
