import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  LOCKOUT_MAX_ATTEMPTS,
  LOCKOUT_DURATION_MINUTES,
  lockedMessage,
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

  it("locks accounts for 15 minutes", () => {
    expect(LOCKOUT_DURATION_MINUTES).toBe(15);
  });
});

describe("lockedMessage", () => {
  it("includes the Thai lockout prefix", () => {
    const msg = lockedMessage(new Date(PINNED_MS + 15 * 60_000));
    expect(msg).toContain(THAI_PREFIX);
  });

  it("reports 15 minutes when the lock expires in exactly 15 minutes", () => {
    const msg = lockedMessage(new Date(PINNED_MS + 15 * 60_000));
    expect(msg).toContain("15 นาที");
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
    const msg = lockedMessage(new Date(PINNED_MS + 15 * 60_000));
    expect(msg).toBe(`${THAI_PREFIX} 15 นาที`);
  });
});
