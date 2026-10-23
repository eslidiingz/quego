import { SignJWT, jwtVerify } from "jose";

export const ADMIN_SESSION_COOKIE = "lq_admin_session";
export const SHOP_SESSION_COOKIE = "lq_shop_session";
export const CUSTOMER_SESSION_COOKIE = "lq_customer_session";
export const SHOP_DISPLAY_COOKIE = "lq_shop_display";
/** Kiosk token lifetime: one long business day, so the tablet lasts open→close. */
export const SHOP_DISPLAY_TTL_SECONDS = 60 * 60 * 12;
export const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 hours
/** Admin acting as a shop gets a shorter token than a real login (audit M7). */
export const IMPERSONATION_TTL_SECONDS = 60 * 60 * 2; // 2 hours

/**
 * Audit M7: every session token carries the identity row's `session_version`
 * (claim "sv"). Changing a PIN/password bumps the row (DB trigger), and the
 * server-side session readers reject tokens whose version is behind. Tokens
 * minted before this claim existed read as version 1, the column default.
 */
export function readSessionVersionClaim(value: unknown): number {
  return typeof value === "number" && Number.isInteger(value) && value > 0
    ? value
    : 1;
}

/** True when a token's version still matches the identity row. */
export function isSessionVersionCurrent(
  tokenVersion: number,
  dbVersion: number | null,
): boolean {
  return dbVersion !== null && tokenVersion === dbVersion;
}

export type AdminSession = {
  adminId: string;
  phone: string;
  name: string;
  /** `admins.session_version` at mint time (audit M7). */
  sessionVersion?: number;
};

export type ShopSession = {
  shopId: string;
  phone: string;
  shopName: string;
  /**
   * If present, the shop session was minted by an admin acting on the shop's
   * behalf (impersonation). The value is the admin's id — used by the shop UI
   * to render the impersonation banner and route sign-out back to /admin.
   */
  impersonatedBy?: string;
  /** `shops.session_version` at mint time (audit M7). */
  sessionVersion?: number;
};

export type CustomerSession = {
  customerId: string;
  phone: string;
  /** `customers.session_version` at mint time (audit M7). */
  sessionVersion?: number;
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

// ----- Admin session ------------------------------------------------------

export async function signSessionToken(session: AdminSession): Promise<string> {
  const { sessionVersion, ...claims } = session;
  return new SignJWT({ ...claims, sv: sessionVersion ?? 1, aud: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecret());
}

export async function verifySessionToken(
  token: string,
): Promise<AdminSession | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: ["HS256"], audience: "admin" });
    if (
      typeof payload.adminId === "string" &&
      typeof payload.phone === "string" &&
      typeof payload.name === "string"
    ) {
      return {
        adminId: payload.adminId,
        phone: payload.phone,
        name: payload.name,
        sessionVersion: readSessionVersionClaim(payload.sv),
      };
    }
    return null;
  } catch {
    return null;
  }
}

// ----- Shop session -------------------------------------------------------

export async function signShopSessionToken(
  session: ShopSession,
  ttlSeconds: number = SESSION_TTL_SECONDS,
): Promise<string> {
  const { sessionVersion, ...claims } = session;
  return new SignJWT({ ...claims, sv: sessionVersion ?? 1, aud: "shop" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(getSecret());
}

export async function verifyShopSessionToken(
  token: string,
): Promise<ShopSession | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: ["HS256"], audience: "shop" });
    if (
      typeof payload.shopId === "string" &&
      typeof payload.phone === "string" &&
      typeof payload.shopName === "string"
    ) {
      return {
        shopId: payload.shopId,
        phone: payload.phone,
        shopName: payload.shopName,
        impersonatedBy:
          typeof payload.impersonatedBy === "string"
            ? payload.impersonatedBy
            : undefined,
        sessionVersion: readSessionVersionClaim(payload.sv),
      };
    }
    return null;
  } catch {
    return null;
  }
}

// ----- Shop display (kiosk) session ---------------------------------------
// A narrow token for the waiting-room tablet (audit M4): it carries only the
// shopId + name and is accepted ONLY by /shop/display — never as an owner
// session — so a customer tapping the kiosk can't reach customers, expenses or
// booking management.

export type ShopDisplaySession = {
  shopId: string;
  shopName: string;
};

export async function signShopDisplayToken(
  session: ShopDisplaySession,
): Promise<string> {
  return new SignJWT({ shopId: session.shopId, shopName: session.shopName, aud: "shop-display" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SHOP_DISPLAY_TTL_SECONDS}s`)
    .sign(getSecret());
}

export async function verifyShopDisplayToken(
  token: string,
): Promise<ShopDisplaySession | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      algorithms: ["HS256"],
      audience: "shop-display",
    });
    if (typeof payload.shopId === "string" && typeof payload.shopName === "string") {
      return { shopId: payload.shopId, shopName: payload.shopName };
    }
    return null;
  } catch {
    return null;
  }
}

// ----- Customer session ---------------------------------------------------

export async function signCustomerSessionToken(
  session: CustomerSession,
): Promise<string> {
  const { sessionVersion, ...claims } = session;
  return new SignJWT({ ...claims, sv: sessionVersion ?? 1, aud: "customer" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecret());
}

export async function verifyCustomerSessionToken(
  token: string,
): Promise<CustomerSession | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      algorithms: ["HS256"],
      audience: "customer",
    });
    if (
      typeof payload.customerId === "string" &&
      typeof payload.phone === "string"
    ) {
      return {
        customerId: payload.customerId,
        phone: payload.phone,
        sessionVersion: readSessionVersionClaim(payload.sv),
      };
    }
    return null;
  } catch {
    return null;
  }
}
