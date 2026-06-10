import { describe, expect, it } from "vitest";
import {
  CLAIM_WINDOW_MINUTES,
  hasOpenSlotForService,
  isReofferable,
} from "./eligibility";
import type {
  BookedInterval,
  BookingContext,
  BookingService,
  BusinessHour,
} from "@/lib/booking/slot-math";

// A weekday inside an arbitrary window. All 7 days share the same hours in the
// fixture, so the exact day-of-week never matters except in the closed-day test.
const DATE = "2026-06-15";

function openHours(): BusinessHour[] {
  return Array.from({ length: 7 }, (_, d) => ({
    dayOfWeek: d as BusinessHour["dayOfWeek"],
    isOpen: true,
    openTime: "09:00",
    closeTime: "17:00",
  }));
}

function closedHours(): BusinessHour[] {
  return Array.from({ length: 7 }, (_, d) => ({
    dayOfWeek: d as BusinessHour["dayOfWeek"],
    isOpen: false,
    openTime: null,
    closeTime: null,
  }));
}

function ctx(overrides: {
  services: BookingService[];
  capacity: number;
  bookedIntervals?: BookedInterval[];
  hours?: BusinessHour[];
  nowDate?: string;
  nowTimeHHMM?: string;
}): BookingContext {
  return {
    shop: { id: "shop1", name: "ร้านทดสอบ", serviceDurationMinutes: 60 },
    services: overrides.services,
    capacity: overrides.capacity,
    bookedIntervals: overrides.bookedIntervals ?? [],
    hours: overrides.hours ?? openHours(),
    windowStart: "2026-06-10",
    windowEnd: "2026-06-25",
    nowDate: overrides.nowDate ?? "2026-06-10",
    nowTimeHHMM: overrides.nowTimeHHMM ?? "08:00",
    staff: [],
  };
}

// A full-day busy interval (09:00–17:00) on one lane.
function fullDay(staffId: string | null): BookedInterval {
  return { date: DATE, startMin: 9 * 60, durationMin: 8 * 60, staffId };
}

const singleQueueService: BookingService = {
  id: "svc1",
  name: "ตัดผม",
  durationMinutes: 60,
  price: null,
  staffIds: null,
};

const staffedService: BookingService = {
  id: "svc1",
  name: "ตัดผม",
  durationMinutes: 60,
  price: null,
  staffIds: ["a", "b"],
};

describe("hasOpenSlotForService", () => {
  it("single-queue shop with no bookings has an open slot", () => {
    const c = ctx({ services: [singleQueueService], capacity: 1 });
    expect(
      hasOpenSlotForService(c, { serviceId: "svc1", preferredStaffId: null, date: DATE }),
    ).toBe(true);
  });

  it("single-queue shop with the one lane busy all day is full", () => {
    const c = ctx({
      services: [singleQueueService],
      capacity: 1,
      bookedIntervals: [fullDay(null)],
    });
    expect(
      hasOpenSlotForService(c, { serviceId: "svc1", preferredStaffId: null, date: DATE }),
    ).toBe(false);
  });

  it('staffed shop, "any staff": full only when EVERY capable staff is busy', () => {
    const bothBusy = ctx({
      services: [staffedService],
      capacity: 2,
      bookedIntervals: [fullDay("a"), fullDay("b")],
    });
    expect(
      hasOpenSlotForService(bothBusy, { serviceId: "svc1", preferredStaffId: null, date: DATE }),
    ).toBe(false);

    const oneFree = ctx({
      services: [staffedService],
      capacity: 2,
      bookedIntervals: [fullDay("a")],
    });
    expect(
      hasOpenSlotForService(oneFree, { serviceId: "svc1", preferredStaffId: null, date: DATE }),
    ).toBe(true);
  });

  it("preferred staff is full even when another capable staff is free", () => {
    const c = ctx({
      services: [staffedService],
      capacity: 2,
      bookedIntervals: [fullDay("a")], // a busy, b free
    });
    // Pinned to busy "a" → full…
    expect(
      hasOpenSlotForService(c, { serviceId: "svc1", preferredStaffId: "a", date: DATE }),
    ).toBe(false);
    // …but free "b" has room.
    expect(
      hasOpenSlotForService(c, { serviceId: "svc1", preferredStaffId: "b", date: DATE }),
    ).toBe(true);
  });

  it("preferred staff who cannot perform the service is never open", () => {
    const c = ctx({ services: [staffedService], capacity: 2 });
    expect(
      hasOpenSlotForService(c, { serviceId: "svc1", preferredStaffId: "z", date: DATE }),
    ).toBe(false);
  });

  it("returns false for an unknown service", () => {
    const c = ctx({ services: [singleQueueService], capacity: 1 });
    expect(
      hasOpenSlotForService(c, { serviceId: "nope", preferredStaffId: null, date: DATE }),
    ).toBe(false);
  });

  it("returns false for a date outside the booking window", () => {
    const c = ctx({ services: [singleQueueService], capacity: 1 });
    expect(
      hasOpenSlotForService(c, { serviceId: "svc1", preferredStaffId: null, date: "2026-07-01" }),
    ).toBe(false);
  });

  it("returns false on a closed day", () => {
    const c = ctx({ services: [singleQueueService], capacity: 1, hours: closedHours() });
    expect(
      hasOpenSlotForService(c, { serviceId: "svc1", preferredStaffId: null, date: DATE }),
    ).toBe(false);
  });

  it("returns false when every slot today has already passed", () => {
    const c = ctx({
      services: [singleQueueService],
      capacity: 1,
      nowDate: DATE,
      nowTimeHHMM: "23:59",
    });
    expect(
      hasOpenSlotForService(c, { serviceId: "svc1", preferredStaffId: null, date: DATE }),
    ).toBe(false);
  });

  it("staffed service with no capable staff assigned is never open", () => {
    const noStaff: BookingService = { ...staffedService, staffIds: [] };
    const c = ctx({ services: [noStaff], capacity: 1 });
    expect(
      hasOpenSlotForService(c, { serviceId: "svc1", preferredStaffId: null, date: DATE }),
    ).toBe(false);
  });
});

describe("isReofferable", () => {
  const now = Date.parse("2026-06-15T10:00:00Z");

  it("a waiting entry is always offerable", () => {
    expect(isReofferable({ status: "waiting", notifiedAt: null }, now)).toBe(true);
  });

  it("a freshly notified entry is NOT re-offerable (within claim window)", () => {
    const justNow = new Date(now - 60_000).toISOString(); // 1 min ago
    expect(isReofferable({ status: "notified", notifiedAt: justNow }, now)).toBe(false);
  });

  it("a notified entry past the claim window rolls on", () => {
    const stale = new Date(now - (CLAIM_WINDOW_MINUTES + 5) * 60_000).toISOString();
    expect(isReofferable({ status: "notified", notifiedAt: stale }, now)).toBe(true);
  });

  it("a notified entry with a missing/invalid timestamp is offerable (fail toward offering)", () => {
    expect(isReofferable({ status: "notified", notifiedAt: null }, now)).toBe(true);
    expect(isReofferable({ status: "notified", notifiedAt: "not-a-date" }, now)).toBe(true);
  });

  it("terminal entries are never re-offered", () => {
    expect(isReofferable({ status: "fulfilled", notifiedAt: null }, now)).toBe(false);
    expect(isReofferable({ status: "cancelled", notifiedAt: null }, now)).toBe(false);
  });
});
