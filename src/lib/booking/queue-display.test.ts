import { describe, it, expect } from "vitest";
import {
  buildDisplayQueue,
  type DisplayQueueRow,
} from "./queue-display";

function row(
  over: Partial<DisplayQueueRow> & { id: string },
): DisplayQueueRow {
  return {
    slotTime: "10:00",
    createdAt: "2026-06-09T03:00:00.000Z",
    staffId: null,
    durationMinutes: 30,
    customerName: "ลูกค้า",
    serviceName: null,
    staffName: null,
    ...over,
  };
}

describe("buildDisplayQueue", () => {
  it("returns an empty snapshot for a day with no bookings", () => {
    const snap = buildDisplayQueue([], "10:00");
    expect(snap).toEqual({
      nowServing: null,
      upcoming: [],
      nextToCallBookingId: null,
      waitingCount: 0,
    });
  });

  it("returns empty when every booking is already in the past", () => {
    const rows = [
      row({ id: "a", slotTime: "08:00" }),
      row({ id: "b", slotTime: "09:30" }),
    ];
    const snap = buildDisplayQueue(rows, "10:00");
    expect(snap.nowServing).toBeNull();
    expect(snap.upcoming).toHaveLength(0);
    expect(snap.nextToCallBookingId).toBeNull();
    expect(snap.waitingCount).toBe(0);
  });

  it("serves the slot exactly at now and lists the rest upcoming", () => {
    // 10:00 has just started (slot == now), 10:30 + 11:00 still upcoming.
    // Past slots (< now) are NOT remaining and never enter the queue.
    const rows = [
      row({ id: "later", slotTime: "11:00" }),
      row({ id: "serving", slotTime: "10:00" }),
      row({ id: "next", slotTime: "10:30" }),
      row({ id: "done", slotTime: "09:30" }),
    ];
    const snap = buildDisplayQueue(rows, "10:00");
    expect(snap.nowServing?.id).toBe("serving");
    // Upcoming excludes the now-serving row, sorted soonest first; the past
    // 09:30 slot is gone (matches the customer view's slot >= now cutoff).
    expect(snap.upcoming.map((r) => r.id)).toEqual(["next", "later"]);
    // Next-to-call is the earliest remaining row (the now-serving one).
    expect(snap.nextToCallBookingId).toBe("serving");
    expect(snap.waitingCount).toBe(3);
  });

  it("falls back to the soonest upcoming when nothing has started yet", () => {
    const rows = [
      row({ id: "b", slotTime: "11:00" }),
      row({ id: "a", slotTime: "10:30" }),
    ];
    const snap = buildDisplayQueue(rows, "10:00");
    // No slot <= 10:00, so the soonest upcoming (10:30) is shown serving.
    expect(snap.nowServing?.id).toBe("a");
    expect(snap.upcoming.map((r) => r.id)).toEqual(["b"]);
    expect(snap.nextToCallBookingId).toBe("a");
    expect(snap.waitingCount).toBe(2);
  });

  it("mixes parallel staff lanes into one shop-wide queue, soonest first", () => {
    const rows = [
      row({ id: "s2-late", slotTime: "11:00", staffId: "s2" }),
      row({ id: "s1-now", slotTime: "10:00", staffId: "s1" }),
      row({ id: "s2-soon", slotTime: "10:15", staffId: "s2" }),
    ];
    const snap = buildDisplayQueue(rows, "10:00");
    // 10:00 has started (<= now) → serving; across lanes it is also next-to-call.
    expect(snap.nowServing?.id).toBe("s1-now");
    expect(snap.nextToCallBookingId).toBe("s1-now");
    expect(snap.upcoming.map((r) => r.id)).toEqual(["s2-soon", "s2-late"]);
    expect(snap.waitingCount).toBe(3);
  });

  it("breaks equal-slot ties by the earlier createdAt", () => {
    // Two different lanes share the soonest slot 10:30; the one booked first
    // becomes now-serving / next-to-call.
    const rows = [
      row({
        id: "second",
        slotTime: "10:30",
        staffId: "s2",
        createdAt: "2026-06-09T04:00:00.000Z",
      }),
      row({
        id: "first",
        slotTime: "10:30",
        staffId: "s1",
        createdAt: "2026-06-09T03:00:00.000Z",
      }),
    ];
    const snap = buildDisplayQueue(rows, "10:00");
    expect(snap.nowServing?.id).toBe("first");
    expect(snap.nextToCallBookingId).toBe("first");
    expect(snap.upcoming.map((r) => r.id)).toEqual(["second"]);
  });

  it("handles a single-queue (null staffId) lane end to end", () => {
    const rows = [
      row({ id: "a", slotTime: "10:00", staffId: null }),
      row({ id: "b", slotTime: "10:30", staffId: null }),
      row({ id: "c", slotTime: "11:00", staffId: null }),
    ];
    const snap = buildDisplayQueue(rows, "10:00");
    // 10:00 started (slot == now); 10:30 and 11:00 upcoming.
    expect(snap.nowServing?.id).toBe("a");
    expect(snap.upcoming.map((r) => r.id)).toEqual(["b", "c"]);
    expect(snap.nextToCallBookingId).toBe("a");
    expect(snap.waitingCount).toBe(3);
  });

  it("includes a slot exactly at now as remaining (started) and serving", () => {
    const snap = buildDisplayQueue(
      [row({ id: "edge", slotTime: "10:00" })],
      "10:00",
    );
    expect(snap.nowServing?.id).toBe("edge");
    expect(snap.upcoming).toHaveLength(0);
    expect(snap.nextToCallBookingId).toBe("edge");
  });
});
