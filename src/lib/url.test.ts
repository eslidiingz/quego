import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getSiteUrl, absoluteUrl } from "@/lib/url";

describe("getSiteUrl", () => {
  beforeEach(() => {
    // Empty string is falsy after .trim(), so each acts as "unset" and the
    // shell's real env can't leak into the assertions below.
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_URL", "");
    vi.stubEnv("VERCEL_URL", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses NEXT_PUBLIC_SITE_URL verbatim when it already has a scheme", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://queva.app");
    expect(getSiteUrl()).toBe("https://queva.app");
  });

  it("strips a trailing slash from NEXT_PUBLIC_SITE_URL", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://queva.app/");
    expect(getSiteUrl()).toBe("https://queva.app");
  });

  it("defaults a bare host without scheme to https", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "queva.app");
    expect(getSiteUrl()).toBe("https://queva.app");
  });

  it("preserves an explicit http scheme", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:4000");
    expect(getSiteUrl()).toBe("http://localhost:4000");
  });

  it("falls back to VERCEL_URL (prefixed https) when SITE_URL is unset", () => {
    vi.stubEnv("VERCEL_URL", "myapp.vercel.app");
    expect(getSiteUrl()).toBe("https://myapp.vercel.app");
  });

  it("prefers NEXT_PUBLIC_VERCEL_URL over VERCEL_URL", () => {
    vi.stubEnv("NEXT_PUBLIC_VERCEL_URL", "public.vercel.app");
    vi.stubEnv("VERCEL_URL", "server.vercel.app");
    expect(getSiteUrl()).toBe("https://public.vercel.app");
  });

  it("strips a trailing slash off the Vercel host too", () => {
    vi.stubEnv("VERCEL_URL", "myapp.vercel.app/");
    expect(getSiteUrl()).toBe("https://myapp.vercel.app");
  });

  it("falls back to the local dev origin when nothing is set", () => {
    expect(getSiteUrl()).toBe("http://localhost:4000");
  });
});

describe("absoluteUrl", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_URL", "");
    vi.stubEnv("VERCEL_URL", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("keeps exactly one leading slash when the path already has one", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://queva.app");
    expect(absoluteUrl("/bookings/1")).toBe("https://queva.app/bookings/1");
  });

  it("adds a leading slash when the path has none", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://queva.app");
    expect(absoluteUrl("x")).toBe("https://queva.app/x");
  });

  it("treats '/x' and 'x' as the same single-slash join", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://queva.app");
    expect(absoluteUrl("/x")).toBe(absoluteUrl("x"));
    expect(absoluteUrl("/x").endsWith("/x")).toBe(true);
    expect(absoluteUrl("x").endsWith("/x")).toBe(true);
  });

  it("joins against the dev fallback origin when nothing is configured", () => {
    expect(absoluteUrl("/share")).toBe("http://localhost:4000/share");
  });
});
