import { describe, it, expect } from "vitest";

import {
  buildSetupChecklist,
  type SetupFacts,
  type SetupTaskKey,
} from "./setup-checklist";

const NOTHING_DONE: SetupFacts = {
  hasService: false,
  hasOpenDay: false,
  hasLocationPin: false,
  hasLogo: false,
  hasActiveStaff: false,
};

const ALL_DONE: SetupFacts = {
  hasService: true,
  hasOpenDay: true,
  hasLocationPin: true,
  hasLogo: true,
  hasActiveStaff: true,
};

const keys = (f: SetupFacts): SetupTaskKey[] =>
  buildSetupChecklist(f).tasks.map((t) => t.key);

describe("buildSetupChecklist — shape", () => {
  it("always returns the same five tasks in booking-readiness order", () => {
    expect(keys(NOTHING_DONE)).toEqual([
      "services",
      "hours",
      "location",
      "images",
      "staff",
    ]);
    expect(keys(ALL_DONE)).toEqual(keys(NOTHING_DONE));
  });

  it("gives every task non-empty copy and an in-app CTA", () => {
    for (const task of buildSetupChecklist(NOTHING_DONE).tasks) {
      expect(task.title.trim().length).toBeGreaterThan(0);
      expect(task.description.trim().length).toBeGreaterThan(0);
      expect(task.ctaLabel.trim().length).toBeGreaterThan(0);
      expect(task.ctaHref.startsWith("/shop")).toBe(true);
    }
  });

  it("marks exactly services and hours as blocking", () => {
    const blocking = buildSetupChecklist(NOTHING_DONE)
      .tasks.filter((t) => t.blocking)
      .map((t) => t.key);
    expect(blocking).toEqual(["services", "hours"]);
  });
});

describe("buildSetupChecklist — blockingTask", () => {
  it("surfaces services before hours when both are outstanding", () => {
    // A shop with no services isn't bookable at all, so that comes first —
    // this preserves the ordering the existing focus modal already relies on.
    expect(buildSetupChecklist(NOTHING_DONE).blockingTask?.key).toBe("services");
  });

  it("falls through to hours once services exist", () => {
    expect(
      buildSetupChecklist({ ...NOTHING_DONE, hasService: true }).blockingTask
        ?.key,
    ).toBe("hours");
  });

  it("is null once the shop can actually take bookings", () => {
    expect(
      buildSetupChecklist({
        ...NOTHING_DONE,
        hasService: true,
        hasOpenDay: true,
      }).blockingTask,
    ).toBeNull();
  });

  it("ignores non-blocking gaps when deciding the blocker", () => {
    const c = buildSetupChecklist({
      ...ALL_DONE,
      hasLocationPin: false,
      hasLogo: false,
      hasActiveStaff: false,
    });
    expect(c.blockingTask).toBeNull();
    expect(c.complete).toBe(false);
  });
});

describe("buildSetupChecklist — progress", () => {
  it("counts nothing done", () => {
    const c = buildSetupChecklist(NOTHING_DONE);
    expect(c.doneCount).toBe(0);
    expect(c.total).toBe(5);
    expect(c.progress).toBe(0);
    expect(c.complete).toBe(false);
  });

  it("counts everything done", () => {
    const c = buildSetupChecklist(ALL_DONE);
    expect(c.doneCount).toBe(5);
    expect(c.progress).toBe(1);
    expect(c.complete).toBe(true);
  });

  it("tracks each fact to exactly one task", () => {
    const cases: [keyof SetupFacts, SetupTaskKey][] = [
      ["hasService", "services"],
      ["hasOpenDay", "hours"],
      ["hasLocationPin", "location"],
      ["hasLogo", "images"],
      ["hasActiveStaff", "staff"],
    ];
    for (const [fact, key] of cases) {
      const c = buildSetupChecklist({ ...NOTHING_DONE, [fact]: true });
      expect(c.doneCount, `${fact} should complete exactly one task`).toBe(1);
      expect(c.tasks.find((t) => t.key === key)?.done).toBe(true);
    }
  });

  it("reports a fractional progress value", () => {
    const c = buildSetupChecklist({
      ...NOTHING_DONE,
      hasService: true,
      hasOpenDay: true,
      hasLogo: true,
    });
    expect(c.doneCount).toBe(3);
    expect(c.progress).toBeCloseTo(0.6);
  });

  it("is not complete while a single non-blocking step is outstanding", () => {
    const c = buildSetupChecklist({ ...ALL_DONE, hasActiveStaff: false });
    expect(c.doneCount).toBe(4);
    expect(c.complete).toBe(false);
    expect(c.blockingTask).toBeNull();
  });
});
