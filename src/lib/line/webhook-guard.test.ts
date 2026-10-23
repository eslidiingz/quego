import { describe, it, expect } from "vitest";

import {
  isStaleLineEvent,
  MAX_EVENT_AGE_MS,
  webhookEventKey,
} from "./webhook-guard";

const NOW = 1_800_000_000_000;

describe("isStaleLineEvent", () => {
  it("accepts a fresh event", () => {
    expect(isStaleLineEvent(NOW - 1000, NOW)).toBe(false);
  });

  it("accepts right at the age limit, rejects just past it", () => {
    expect(isStaleLineEvent(NOW - MAX_EVENT_AGE_MS, NOW)).toBe(false);
    expect(isStaleLineEvent(NOW - MAX_EVENT_AGE_MS - 1, NOW)).toBe(true);
  });

  it("rejects events stamped far in the future", () => {
    expect(isStaleLineEvent(NOW + 61_000, NOW)).toBe(true);
    expect(isStaleLineEvent(NOW + 10_000, NOW)).toBe(false);
  });

  it("treats a missing or non-numeric timestamp as stale", () => {
    expect(isStaleLineEvent(undefined, NOW)).toBe(true);
    expect(isStaleLineEvent("123", NOW)).toBe(true);
    expect(isStaleLineEvent(NaN, NOW)).toBe(true);
  });
});

describe("webhookEventKey", () => {
  it("namespaces the id so it can't collide with message ids", () => {
    expect(webhookEventKey("01ABC")).toBe("evt:01ABC");
  });

  it("returns null when there is no usable id", () => {
    expect(webhookEventKey(undefined)).toBeNull();
    expect(webhookEventKey("")).toBeNull();
    expect(webhookEventKey(5)).toBeNull();
  });
});
