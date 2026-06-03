import { SignJWT, jwtVerify } from "jose";

export const ADMIN_SESSION_COOKIE = "lq_admin_session";
export const SHOP_SESSION_COOKIE = "lq_shop_session";
export const CUSTOMER_SESSION_COOKIE = "lq_customer_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 hours

export type AdminSession = {
  adminId: string;
  phone: string;
  name: string;
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
};

export type CustomerSession = {
  customerId: string;
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

// ----- Admin session ------------------------------------------------------

export async function signSessionToken(session: AdminSession): Promise<string> {
  return new SignJWT({ ...session, aud: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecret());
}

export async function verifySessionToken(
  token: string,
): Promise<AdminSession | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), { audience: "admin" });
    if (
      typeof payload.adminId === "string" &&
      typeof payload.phone === "string" &&
      typeof payload.name === "string"
    ) {
      return {
        adminId: payload.adminId,
        phone: payload.phone,
        name: payload.name,
      };
    }
    return null;
  } catch {
    return null;
  }
}

// ----- Shop session -------------------------------------------------------

export async function signShopSessionToken(session: ShopSession): Promise<string> {
  return new SignJWT({ ...session, aud: "shop" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecret());
}

export async function verifyShopSessionToken(
  token: string,
): Promise<ShopSession | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), { audience: "shop" });
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
      };
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
  return new SignJWT({ ...session, aud: "customer" })
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
      audience: "customer",
    });
    if (
      typeof payload.customerId === "string" &&
      typeof payload.phone === "string"
    ) {
      return { customerId: payload.customerId, phone: payload.phone };
    }
    return null;
  } catch {
    return null;
  }
}
