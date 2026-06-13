import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  LOCKOUT_MAX_ATTEMPTS,
  LOCKOUT_DURATION_MINUTES,
  lockedMessage,
  remainingAttemptsMessage,
} from "@/lib/auth/lockout";

const PINNED_MS = new Date("2026-06-09T12:00:00.000Z").getTime();
const THAI_PREFIX = "บัญชีถูกล็อกชั่วคราวจากการกรอกผิดหลายครั้ง กรุณาลองใหม่ในอีกประมาณ";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(PINNED_MS));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("lockout constants", () => {
  it("caps consecutive failures at 5", () => {
    expect(LOCKOUT_MAX_ATTEMPTS).toBe(5);
  });

  it("locks accounts for 10 minutes", () => {
    expect(LOCKOUT_DURATION_MINUTES).toBe(10);
  });
});

describe("lockedMessage", () => {
  it("includes the Thai lockout prefix", () => {
    const msg = lockedMessage(new Date(PINNED_MS + 15 * 60_000));
    expect(msg).toContain(THAI_PREFIX);
  });

  it("reports 10 minutes when the lock expires in exactly 10 minutes", () => {
    const msg = lockedMessage(new Date(PINNED_MS + 10 * 60_000));
    expect(msg).toContain("10 นาที");
  });

  it("reports 1 minute when the lock expires in exactly 1 minute", () => {
    const msg = lockedMessage(new Date(PINNED_MS + 1 * 60_000));
    expect(msg).toContain("1 นาที");
  });

  it("floors at 1 minute when the lock is already in the past", () => {
    const msg = lockedMessage(new Date(PINNED_MS - 5 * 60_000));
    expect(msg).toContain("1 นาที");
  });

  it("rounds 90 seconds up to 2 minutes", () => {
    const msg = lockedMessage(new Date(PINNED_MS + 90 * 1000));
    expect(msg).toContain("2 นาที");
  });

  it("rounds 61 seconds up to 2 minutes", () => {
    const msg = lockedMessage(new Date(PINNED_MS + 61 * 1000));
    expect(msg).toContain("2 นาที");
  });

  it("composes the full message with prefix and remaining minutes", () => {
    const msg = lockedMessage(new Date(PINNED_MS + 10 * 60_000));
    expect(msg).toBe(`${THAI_PREFIX} 10 นาที`);
  });
});

describe("remainingAttemptsMessage", () => {
  it("returns null on the 1st wrong attempt", () => {
    expect(remainingAttemptsMessage(1)).toBeNull();
  });

  it("returns null on the 2nd wrong attempt", () => {
    expect(remainingAttemptsMessage(2)).toBeNull();
  });

  it("warns with 2 remaining on the 3rd wrong attempt", () => {
    expect(remainingAttemptsMessage(3)).toBe(
      "เหลืออีก 2 ครั้ง บัญชีจะถูกล็อกชั่วคราว",
    );
  });

  it("warns with 1 remaining on the 4th wrong attempt", () => {
    expect(remainingAttemptsMessage(4)).toBe(
      "เหลืออีก 1 ครั้ง บัญชีจะถูกล็อกชั่วคราว",
    );
  });

  it("returns null at the lockout threshold (attempt 5)", () => {
    expect(remainingAttemptsMessage(5)).toBeNull();
  });

  it("returns null beyond the threshold", () => {
    expect(remainingAttemptsMessage(6)).toBeNull();
  });
});
