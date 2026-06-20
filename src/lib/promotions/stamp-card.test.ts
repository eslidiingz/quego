import { describe, it, expect } from "vitest";
import {
  computeStampProgress,
  isEligibleToRedeem,
  isValidRequiredStamps,
  STAMP_PER_COMPLETED_BOOKING,
  MIN_REQUIRED_STAMPS,
  MAX_REQUIRED_STAMPS,
} from "./stamp-card";

describe("STAMP_PER_COMPLETED_BOOKING", () => {
  it("is a flat 1 stamp per completed booking", () => {
    expect(STAMP_PER_COMPLETED_BOOKING).toBe(1);
  });
});

describe("computeStampProgress", () => {
  // Example from the brief: ใช้บริการครบ 10 ครั้ง ได้ตัดผมฟรี 1 ครั้ง.
  it("counts up toward the next reward within a cycle", () => {
    expect(computeStampProgress(0, 10)).toEqual({
      balance: 0,
      redeemable: 0,
      towardNext: 0,
      required: 10,
    });
    expect(computeStampProgress(3, 10)).toEqual({
      balance: 3,
      redeemable: 0,
      towardNext: 3,
      required: 10,
    });
    expect(computeStampProgress(9, 10)).toEqual({
      balance: 9,
      redeemable: 0,
      towardNext: 9,
      required: 10,
    });
  });

  it("becomes redeemable exactly at the required count, resetting towardNext", () => {
    expect(computeStampProgress(10, 10)).toEqual({
      balance: 10,
      redeemable: 1,
      towardNext: 0,
      required: 10,
    });
  });

  it("keeps counting past one cycle (un-redeemed rewards stack)", () => {
    expect(computeStampProgress(23, 10)).toEqual({
      balance: 23,
      redeemable: 2,
      towardNext: 3,
      required: 10,
    });
  });

  it("floors a negative net balance (over-redeemed/adjusted) at zero", () => {
    expect(computeStampProgress(-5, 10)).toEqual({
      balance: 0,
      redeemable: 0,
      towardNext: 0,
      required: 10,
    });
  });

  it("tolerates junk input: NaN balance and a non-positive required", () => {
    expect(computeStampProgress(Number.NaN, 10).balance).toBe(0);
    // required falls back to 1, so any positive balance is fully redeemable.
    expect(computeStampProgress(4, 0)).toEqual({
      balance: 4,
      redeemable: 4,
      towardNext: 0,
      required: 1,
    });
  });

  it("truncates a fractional balance", () => {
    expect(computeStampProgress(7.9, 10).balance).toBe(7);
  });
});

describe("isEligibleToRedeem", () => {
  it("is false below the threshold and true at/above it", () => {
    expect(isEligibleToRedeem(9, 10)).toBe(false);
    expect(isEligibleToRedeem(10, 10)).toBe(true);
    expect(isEligibleToRedeem(25, 10)).toBe(true);
  });
});

describe("isValidRequiredStamps", () => {
  it("accepts integers within [1, 100]", () => {
    expect(isValidRequiredStamps(MIN_REQUIRED_STAMPS)).toBe(true);
    expect(isValidRequiredStamps(10)).toBe(true);
    expect(isValidRequiredStamps(MAX_REQUIRED_STAMPS)).toBe(true);
  });

  it("rejects out-of-range, non-integer, and non-finite values", () => {
    expect(isValidRequiredStamps(0)).toBe(false);
    expect(isValidRequiredStamps(101)).toBe(false);
    expect(isValidRequiredStamps(2.5)).toBe(false);
    expect(isValidRequiredStamps(Number.NaN)).toBe(false);
  });
});
