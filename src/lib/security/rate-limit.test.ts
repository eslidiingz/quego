import { describe, it, expect, vi, beforeEach } from "vitest";

// Hoisted shared state — vi.mock factories cannot close over normal outer
// variables, so the fake header map and supabase rpc live on hoisted objects.
const h = vi.hoisted(() => ({ map: new Map<string, string>() }));
const sb = vi.hoisted(() => ({ rpc: vi.fn() }));

vi.mock("next/headers", () => ({
  headers: async () => ({ get: (k: string) => h.map.get(k) ?? null }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: () => sb,
}));

import { checkRateLimit, getClientIp, checkRateLimits } from "@/lib/security/rate-limit";

beforeEach(() => {
  sb.rpc.mockReset();
  h.map = new Map();
});

describe("getClientIp", () => {
  it("returns x-real-ip when present", async () => {
    h.map = new Map([["x-real-ip", "1.2.3.4"]]);
    expect(await getClientIp()).toBe("1.2.3.4");
  });

  it("trims surrounding whitespace on x-real-ip", async () => {
    h.map = new Map([["x-real-ip", "  1.2.3.4  "]]);
    expect(await getClientIp()).toBe("1.2.3.4");
  });

  it("returns the RIGHTMOST x-forwarded-for hop (anti-spoof) when no x-real-ip", async () => {
    h.map = new Map([["x-forwarded-for", "a.a.a.a, b.b.b.b, 9.9.9.9"]]);
    expect(await getClientIp()).toBe("9.9.9.9");
  });

  it("returns the single x-forwarded-for value as-is", async () => {
    h.map = new Map([["x-forwarded-for", "1.1.1.1"]]);
    expect(await getClientIp()).toBe("1.1.1.1");
  });

  it("falls back to 'unknown' when neither header is present", async () => {
    expect(await getClientIp()).toBe("unknown");
  });

  it("prefers x-real-ip over x-forwarded-for when both are present", async () => {
    h.map = new Map([
      ["x-real-ip", "1.2.3.4"],
      ["x-forwarded-for", "a.a.a.a, 9.9.9.9"],
    ]);
    expect(await getClientIp()).toBe("1.2.3.4");
  });
});

describe("checkRateLimit", () => {
  it("returns true when the RPC allows the hit (data: true)", async () => {
    sb.rpc.mockResolvedValue({ data: true, error: null });
    expect(await checkRateLimit("bucket", 5, 60)).toBe(true);
  });

  it("returns false when the RPC denies the hit (data: false)", async () => {
    sb.rpc.mockResolvedValue({ data: false, error: null });
    expect(await checkRateLimit("bucket", 5, 60)).toBe(false);
  });

  it("fails open (returns true) on an RPC error", async () => {
    sb.rpc.mockResolvedValue({ data: null, error: { message: "boom" } });
    expect(await checkRateLimit("bucket", 5, 60)).toBe(true);
  });

  it("fails open (returns true) and never throws when the RPC rejects", async () => {
    sb.rpc.mockRejectedValue(new Error("x"));
    await expect(checkRateLimit("bucket", 5, 60)).resolves.toBe(true);
  });
});

describe("checkRateLimits", () => {
  it("returns true when every bucket allows", async () => {
    sb.rpc.mockResolvedValue({ data: true, error: null });
    const result = await checkRateLimits([
      { bucket: "b1", limit: 5, windowSeconds: 60 },
      { bucket: "b2", limit: 10, windowSeconds: 600 },
    ]);
    expect(result).toBe(true);
    expect(sb.rpc).toHaveBeenCalledTimes(2);
  });

  it("returns false when one bucket denies", async () => {
    sb.rpc
      .mockResolvedValueOnce({ data: true, error: null })
      .mockResolvedValueOnce({ data: false, error: null });
    const result = await checkRateLimits([
      { bucket: "b1", limit: 5, windowSeconds: 60 },
      { bucket: "b2", limit: 10, windowSeconds: 600 },
    ]);
    expect(result).toBe(false);
  });

  it("does NOT short-circuit: every bucket still increments even when the first denies", async () => {
    sb.rpc
      .mockResolvedValueOnce({ data: false, error: null })
      .mockResolvedValueOnce({ data: true, error: null });
    const result = await checkRateLimits([
      { bucket: "b1", limit: 5, windowSeconds: 60 },
      { bucket: "b2", limit: 10, windowSeconds: 600 },
    ]);
    expect(result).toBe(false);
    expect(sb.rpc).toHaveBeenCalledTimes(2);
  });
});
