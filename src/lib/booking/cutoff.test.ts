import { describe, it, expect } from "vitest";
import { isPastChangeCutoff } from "./cutoff";

const now = { date: "2026-06-09", timeHHMM: "12:00" };

describe("isPastChangeCutoff", () => {
  it("cutoff 0: a future slot today is still changeable", () => {
    expect(isPastChangeCutoff("2026-06-09", "14:00", 0, now)).toBe(false);
  });

  it("cutoff 0: a slot starting exactly now is too late", () => {
    expect(isPastChangeCutoff("2026-06-09", "12:00", 0, now)).toBe(true);
  });

  it("cutoff 0: a past slot is too late", () => {
    expect(isPastChangeCutoff("2026-06-09", "11:50", 0, now)).toBe(true);
  });

  it("cutoff 24: a slot 23h away is too late", () => {
    expect(isPastChangeCutoff("2026-06-10", "11:00", 24, now)).toBe(true);
  });

  it("cutoff 24: a slot 25h away is changeable", () => {
    expect(isPastChangeCutoff("2026-06-10", "13:00", 24, now)).toBe(false);
  });

  it("cutoff 24: exactly 24h away is too late (boundary inclusive)", () => {
    expect(isPastChangeCutoff("2026-06-10", "12:00", 24, now)).toBe(true);
  });

  it("crosses midnight + month boundary correctly", () => {
    const eom = { date: "2026-06-30", timeHHMM: "23:30" };
    // slot 30 min away, cutoff 1h → too late
    expect(isPastChangeCutoff("2026-07-01", "00:00", 1, eom)).toBe(true);
    // slot 90 min away, cutoff 1h → changeable
    expect(isPastChangeCutoff("2026-07-01", "01:00", 1, eom)).toBe(false);
  });

  it("negative / NaN cutoff is clamped to 0 (never widens the gate)", () => {
    expect(isPastChangeCutoff("2026-06-09", "14:00", -5, now)).toBe(false);
    expect(isPastChangeCutoff("2026-06-09", "11:00", Number.NaN, now)).toBe(true);
  });

  it("cutoff above 168 is clamped to 168 (never over-restricts)", () => {
    // 169h ahead → outside the clamped 168h window → still changeable
    expect(isPastChangeCutoff("2026-06-16", "13:00", 500, now)).toBe(false);
    // 167h ahead → inside the clamped 168h window → too late
    expect(isPastChangeCutoff("2026-06-16", "11:00", 500, now)).toBe(true);
  });
});
