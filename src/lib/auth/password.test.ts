import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

describe("hashPassword / verifyPassword round-trip", () => {
  it("verifies a password against its own hash", async () => {
    const h = await hashPassword("s3cret-pw");
    expect(await verifyPassword("s3cret-pw", h)).toBe(true);
  });

  it("rejects a wrong password", async () => {
    const h = await hashPassword("s3cret-pw");
    expect(await verifyPassword("wrong", h)).toBe(false);
  });

  it("round-trips a numeric PIN", async () => {
    const h = await hashPassword("123456");
    expect(await verifyPassword("123456", h)).toBe(true);
    expect(await verifyPassword("654321", h)).toBe(false);
  });
});

describe("hashPassword format", () => {
  it("emits the scrypt$16384$8$1$ prefix", async () => {
    const h = await hashPassword("s3cret-pw");
    expect(h).toMatch(/^scrypt\$16384\$8\$1\$/);
  });

  it("splits into 6 dollar-separated parts", async () => {
    const h = await hashPassword("s3cret-pw");
    expect(h.split("$")).toHaveLength(6);
  });

  it("uses a random salt so two hashes of the same password differ", async () => {
    const a = await hashPassword("same-password");
    const b = await hashPassword("same-password");
    expect(a).not.toBe(b);
  });
});

describe("verifyPassword on malformed stored values returns false (never throws)", () => {
  it("rejects an empty string", async () => {
    expect(await verifyPassword("whatever", "")).toBe(false);
  });

  it("rejects a plaintext-only string", async () => {
    expect(await verifyPassword("whatever", "plaintext")).toBe(false);
  });

  it("rejects a too-short scrypt$bad value", async () => {
    expect(await verifyPassword("whatever", "scrypt$bad")).toBe(false);
  });

  it("rejects a 5-part string", async () => {
    expect(await verifyPassword("whatever", "scrypt$16384$8$1$aa")).toBe(false);
  });

  it("rejects a non-scrypt algo prefix", async () => {
    expect(await verifyPassword("whatever", "bcrypt$16384$8$1$aa$bb")).toBe(
      false,
    );
  });

  it("rejects non-numeric scrypt params", async () => {
    expect(await verifyPassword("whatever", "scrypt$x$8$1$aa$bb")).toBe(false);
  });
});
