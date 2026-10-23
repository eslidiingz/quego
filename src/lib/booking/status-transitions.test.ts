import { describe, it, expect } from "vitest";

import { allowedFromStatuses, canTransitionBooking } from "./status-transitions";

describe("canTransitionBooking", () => {
  it("lets a confirmed booking be completed or cancelled", () => {
    expect(canTransitionBooking("confirmed", "completed")).toBe(true);
    expect(canTransitionBooking("confirmed", "cancelled")).toBe(true);
  });

  it("never revives a cancelled booking", () => {
    expect(canTransitionBooking("cancelled", "completed")).toBe(false);
    expect(canTransitionBooking("cancelled", "confirmed")).toBe(false);
  });

  it("treats completed as terminal", () => {
    expect(canTransitionBooking("completed", "cancelled")).toBe(false);
    expect(canTransitionBooking("completed", "confirmed")).toBe(false);
  });

  it("rejects no-op transitions", () => {
    expect(canTransitionBooking("completed", "completed")).toBe(false);
  });
});

describe("allowedFromStatuses", () => {
  it("nothing may move back to confirmed", () => {
    expect(allowedFromStatuses("confirmed")).toEqual([]);
  });
});
