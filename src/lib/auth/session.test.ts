import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  signSessionToken,
  verifySessionToken,
  signShopSessionToken,
  verifyShopSessionToken,
  signCustomerSessionToken,
  verifyCustomerSessionToken,
  SESSION_TTL_SECONDS,
} from "@/lib/auth/session";

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
    expect(await verifySessionToken(token)).toEqual(session);
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
    expect(verified).toEqual(session);
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
    expect(verified).toEqual({ ...session, impersonatedBy: undefined });
    expect(verified?.impersonatedBy).toBeUndefined();
  });
});

describe("customer session round-trip", () => {
  it("signs then verifies a customer payload back to the same object", async () => {
    const session = { customerId: "c1", phone: "0899999999" };
    const token = await signCustomerSessionToken(session);
    expect(await verifyCustomerSessionToken(token)).toEqual(session);
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
