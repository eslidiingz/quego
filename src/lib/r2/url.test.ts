import { describe, it, expect, afterEach } from "vitest";
import { shopImageUrl } from "./url";

const ENV_KEY = "NEXT_PUBLIC_R2_PUBLIC_BASE_URL";
const original = process.env[ENV_KEY];

afterEach(() => {
  if (original === undefined) delete process.env[ENV_KEY];
  else process.env[ENV_KEY] = original;
});

describe("shopImageUrl", () => {
  it("joins the base and key", () => {
    process.env[ENV_KEY] = "https://img.quego.app";
    expect(shopImageUrl("shops/abc/logo-123.png")).toBe(
      "https://img.quego.app/shops/abc/logo-123.png",
    );
  });

  it("trims a trailing slash on the base", () => {
    process.env[ENV_KEY] = "https://img.quego.app/";
    expect(shopImageUrl("shops/abc/cover-1.jpg")).toBe(
      "https://img.quego.app/shops/abc/cover-1.jpg",
    );
  });

  it("returns null for a null/undefined/empty key", () => {
    process.env[ENV_KEY] = "https://img.quego.app";
    expect(shopImageUrl(null)).toBeNull();
    expect(shopImageUrl(undefined)).toBeNull();
    expect(shopImageUrl("")).toBeNull();
  });

  it("returns null (not a broken URL) when the base env is unset", () => {
    delete process.env[ENV_KEY];
    expect(shopImageUrl("shops/abc/logo-123.png")).toBeNull();
  });
});
