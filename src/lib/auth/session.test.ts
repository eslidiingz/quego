import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  signSessionToken,
  verifySessionToken,
  signShopSessionToken,
  verifyShopSessionToken,
  signCustomerSessionToken,
  verifyCustomerSessionToken,
  SESSION_TTL_SECONDS,
  IMPERSONATION_TTL_SECONDS,
  isSessionVersionCurrent,
  readSessionVersionClaim,
} from "@/lib/auth/session";
import { decodeJwt } from "jose";

beforeEach(() => {
  vi.stubEnv("ADMIN_SESSION_SECRET", "x".repeat(40));
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("admin session round-trip", () => {
  it("signs then verifies an admin payload back to the same object", async () => {
    const session = { adminId: "a1", phone: "0800000000", name: "แอดมิน" };
    const token = await signSessionToken(session);
    expect(await verifySessionToken(token)).toEqual({ ...session, sessionVersion: 1 });
  });
});

describe("shop session round-trip", () => {
  it("preserves impersonatedBy when the session was minted by an admin", async () => {
    const session = {
      shopId: "s1",
      phone: "0811111111",
      shopName: "ร้านตัดผม",
      impersonatedBy: "admin1",
    };
    const token = await signShopSessionToken(session);
    const verified = await verifyShopSessionToken(token);
    expect(verified).toEqual({ ...session, sessionVersion: 1 });
    expect(verified?.impersonatedBy).toBe("admin1");
  });

  it("returns impersonatedBy as undefined for a plain shop session", async () => {
    const session = {
      shopId: "s2",
      phone: "0822222222",
      shopName: "ร้านเสริมสวย",
    };
    const token = await signShopSessionToken(session);
    const verified = await verifyShopSessionToken(token);
    expect(verified).toEqual({ ...session, impersonatedBy: undefined, sessionVersion: 1 });
    expect(verified?.impersonatedBy).toBeUndefined();
  });
});

describe("customer session round-trip", () => {
  it("signs then verifies a customer payload back to the same object", async () => {
    const session = { customerId: "c1", phone: "0899999999" };
    const token = await signCustomerSessionToken(session);
    expect(await verifyCustomerSessionToken(token)).toEqual({ ...session, sessionVersion: 1 });
  });
});

describe("audience isolation across personas", () => {
  it("rejects an admin token when verified as shop or customer", async () => {
    const adminToken = await signSessionToken({
      adminId: "a1",
      phone: "0800000000",
      name: "แอดมิน",
    });
    expect(await verifyShopSessionToken(adminToken)).toBeNull();
    expect(await verifyCustomerSessionToken(adminToken)).toBeNull();
  });

  it("rejects a shop token when verified as admin or customer", async () => {
    const shopToken = await signShopSessionToken({
      shopId: "s1",
      phone: "0811111111",
      shopName: "ร้านตัดผม",
    });
    expect(await verifySessionToken(shopToken)).toBeNull();
    expect(await verifyCustomerSessionToken(shopToken)).toBeNull();
  });

  it("rejects a customer token when verified as admin or shop", async () => {
    const customerToken = await signCustomerSessionToken({
      customerId: "c1",
      phone: "0899999999",
    });
    expect(await verifySessionToken(customerToken)).toBeNull();
    expect(await verifyShopSessionToken(customerToken)).toBeNull();
  });
});

describe("tamper resistance", () => {
  it("returns null without throwing when a payload character is flipped", async () => {
    const token = await signSessionToken({
      adminId: "a1",
      phone: "0800000000",
      name: "แอดมิน",
    });
    const [header, payload, signature] = token.split(".");
    const flipped = payload[0] === "A" ? "B" : "A";
    const tampered = `${header}.${flipped}${payload.slice(1)}.${signature}`;
    expect(await verifySessionToken(tampered)).toBeNull();
  });

  it("returns null for a non-JWT garbage string", async () => {
    expect(await verifySessionToken("not.a.jwt")).toBeNull();
  });
});

describe("secret requirement", () => {
  it("throws when ADMIN_SESSION_SECRET is empty", async () => {
    vi.stubEnv("ADMIN_SESSION_SECRET", "");
    await expect(
      signSessionToken({ adminId: "a", phone: "p", name: "n" }),
    ).rejects.toThrow();
  });

  it("throws when ADMIN_SESSION_SECRET is under 32 chars", async () => {
    vi.stubEnv("ADMIN_SESSION_SECRET", "short");
    await expect(
      signSessionToken({ adminId: "a", phone: "p", name: "n" }),
    ).rejects.toThrow();
  });
});

describe("session ttl constant", () => {
  it("is eight hours expressed in seconds", () => {
    expect(SESSION_TTL_SECONDS).toBe(60 * 60 * 8);
  });
});

describe("session versioning — audit M7", () => {
  it("embeds the session version as the sv claim and reads it back", async () => {
    const token = await signShopSessionToken({
      shopId: "s1",
      phone: "0811111111",
      shopName: "ร้าน",
      sessionVersion: 4,
    });
    expect(decodeJwt(token).sv).toBe(4);
    expect((await verifyShopSessionToken(token))?.sessionVersion).toBe(4);
  });

  it("reads a missing or malformed sv claim as version 1 (pre-M7 tokens)", () => {
    expect(readSessionVersionClaim(undefined)).toBe(1);
    expect(readSessionVersionClaim("3")).toBe(1);
    expect(readSessionVersionClaim(0)).toBe(1);
    expect(readSessionVersionClaim(2)).toBe(2);
  });

  it("a token is current only when its version equals the DB row's", () => {
    expect(isSessionVersionCurrent(2, 2)).toBe(true);
    expect(isSessionVersionCurrent(1, 2)).toBe(false);
    expect(isSessionVersionCurrent(1, null)).toBe(false);
  });

  it("impersonation tokens expire after 2 hours", async () => {
    const token = await signShopSessionToken(
      { shopId: "s1", phone: "0811111111", shopName: "ร้าน", impersonatedBy: "a1" },
      IMPERSONATION_TTL_SECONDS,
    );
    const { iat, exp } = decodeJwt(token);
    expect(IMPERSONATION_TTL_SECONDS).toBe(2 * 60 * 60);
    expect((exp ?? 0) - (iat ?? 0)).toBe(IMPERSONATION_TTL_SECONDS);
  });
});
