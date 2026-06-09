import { describe, it, expect } from "vitest";
import {
  sameLane,
  isAhead,
  isRemaining,
  computeQueueAhead,
  type QueueLaneRow,
} from "./queue-position";

function row(over: Partial<QueueLaneRow> & { id: string }): QueueLaneRow {
  return {
    slotTime: "10:00",
    createdAt: "2026-06-09T03:00:00.000Z",
    staffId: null,
    durationMinutes: 30,
    ...over,
  };
}

describe("sameLane", () => {
  it("treats two null-staff bookings as one shared lane", () => {
    expect(sameLane(row({ id: "a" }), row({ id: "b" }))).toBe(true);
  });

  it("matches identical staff ids", () => {
    expect(
      sameLane(row({ id: "a", staffId: "s1" }), row({ id: "b", staffId: "s1" })),
    ).toBe(true);
  });

  it("separates different staff into different lanes", () => {
    expect(
      sameLane(row({ id: "a", staffId: "s1" }), row({ id: "b", staffId: "s2" })),
    ).toBe(false);
  });

  it("separates a staffed booking from a null-staff one", () => {
    expect(
      sameLane(row({ id: "a", staffId: "s1" }), row({ id: "b", staffId: null })),
    ).toBe(false);
  });
});

describe("isAhead", () => {
  const target = row({ id: "t", slotTime: "14:00" });

  it("counts an earlier slot in the same lane", () => {
    expect(isAhead(row({ id: "a", slotTime: "13:00" }), target)).toBe(true);
  });

  it("does not count a later slot", () => {
    expect(isAhead(row({ id: "a", slotTime: "15:00" }), target)).toBe(false);
  });

  it("never counts the target against itself", () => {
    expect(isAhead({ ...target }, target)).toBe(false);
  });

  it("ignores an earlier slot in a different lane", () => {
    expect(
      isAhead(
        row({ id: "a", slotTime: "13:00", staffId: "s2" }),
        row({ id: "t", slotTime: "14:00", staffId: "s1" }),
      ),
    ).toBe(false);
  });

  it("breaks an equal-slot tie on createdAt (earlier booking is ahead)", () => {
    const t = row({
      id: "t",
      slotTime: "14:00",
      createdAt: "2026-06-09T05:00:00.000Z",
    });
    const earlier = row({
      id: "a",
      slotTime: "14:00",
      createdAt: "2026-06-09T04:00:00.000Z",
    });
    const later = row({
      id: "b",
      slotTime: "14:00",
      createdAt: "2026-06-09T06:00:00.000Z",
    });
    expect(isAhead(earlier, t)).toBe(true);
    expect(isAhead(later, t)).toBe(false);
  });
});

describe("isRemaining", () => {
  it("keeps a slot at or after now", () => {
    expect(isRemaining(row({ id: "a", slotTime: "10:00" }), "10:00")).toBe(true);
    expect(isRemaining(row({ id: "a", slotTime: "11:30" }), "10:00")).toBe(true);
  });

  it("drops a slot whose time has already passed", () => {
    expect(isRemaining(row({ id: "a", slotTime: "09:30" }), "10:00")).toBe(
      false,
    );
  });
});

describe("computeQueueAhead", () => {
  it("returns zero ahead and zero wait when first in line (you're next)", () => {
    const target = row({ id: "t", slotTime: "09:00" });
    const rows = [target, row({ id: "b", slotTime: "10:00" })];
    // "08:00" is before every slot here, so the remaining-cutoff is a no-op and
    // these assertions exercise pure lane ordering.
    expect(computeQueueAhead(target, rows, "08:00")).toEqual({
      queueAhead: 0,
      estimatedWaitMinutes: 0,
    });
  });

  it("counts earlier same-lane bookings and sums their durations", () => {
    const target = row({ id: "t", slotTime: "12:00" });
    const rows = [
      target,
      row({ id: "a", slotTime: "10:00", durationMinutes: 30 }),
      row({ id: "b", slotTime: "11:00", durationMinutes: 45 }),
      row({ id: "c", slotTime: "13:00", durationMinutes: 60 }), // later → ignored
    ];
    expect(computeQueueAhead(target, rows, "08:00")).toEqual({
      queueAhead: 2,
      estimatedWaitMinutes: 75,
    });
  });

  it("only counts the target's own lane in a staffed shop", () => {
    const target = row({ id: "t", slotTime: "12:00", staffId: "s1" });
    const rows = [
      target,
      row({ id: "a", slotTime: "10:00", staffId: "s1", durationMinutes: 30 }),
      row({ id: "b", slotTime: "09:00", staffId: "s2", durationMinutes: 90 }), // other lane
    ];
    expect(computeQueueAhead(target, rows, "08:00")).toEqual({
      queueAhead: 1,
      estimatedWaitMinutes: 30,
    });
  });

  it("ignores earlier-lane bookings whose slot has already passed (now-aware)", () => {
    const target = row({ id: "t", slotTime: "14:00" });
    const rows = [
      target,
      row({ id: "a", slotTime: "10:00", durationMinutes: 30 }), // done → excluded
      row({ id: "b", slotTime: "13:45", durationMinutes: 20 }), // still ahead
    ];
    expect(computeQueueAhead(target, rows, "13:00")).toEqual({
      queueAhead: 1,
      estimatedWaitMinutes: 20,
    });
  });

  it("says you're next once every earlier slot has passed", () => {
    const target = row({ id: "t", slotTime: "14:00" });
    const rows = [
      target,
      row({ id: "a", slotTime: "11:00", durationMinutes: 30 }),
      row({ id: "b", slotTime: "12:30", durationMinutes: 45 }),
    ];
    expect(computeQueueAhead(target, rows, "13:00")).toEqual({
      queueAhead: 0,
      estimatedWaitMinutes: 0,
    });
  });
});
