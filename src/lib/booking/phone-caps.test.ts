import { describe, expect, it } from "vitest";
import {
  PHONE_CAPS,
  evaluatePhoneCaps,
  type PhoneBookingRow,
  type PhoneCapInput,
} from "./phone-caps";

const NOW = Date.parse("2026-10-25T10:00:00+07:00");
const TODAY = "2026-10-25";
const OLD = "2026-10-20T10:00:00+07:00"; // outside the 24h window

function row(over: Partial<PhoneBookingRow> = {}): PhoneBookingRow {
  return {
    shopId: "shop-a",
    bookingDate: "2026-10-27",
    status: "confirmed",
    createdBy: "customer",
    createdAt: OLD,
    ...over,
  };
}

function input(rows: PhoneBookingRow[], over: Partial<PhoneCapInput> = {}): PhoneCapInput {
  return {
    rows,
    origin: "customer",
    shopId: "shop-a",
    date: "2026-10-27",
    today: TODAY,
    nowMs: NOW,
    ...over,
  };
}

describe("evaluatePhoneCaps", () => {
  it("allows a first booking", () => {
    expect(evaluatePhoneCaps(input([]))).toBeNull();
  });

  it("allows a second booking same shop same day (family member)", () => {
    expect(evaluatePhoneCaps(input([row()]))).toBeNull();
  });

  it("blocks a third booking same shop same day", () => {
    expect(evaluatePhoneCaps(input([row(), row()]))).toBe("per_shop_per_day");
  });

  it("blocks a fourth upcoming booking at one shop across days", () => {
    const rows = [
      row({ bookingDate: "2026-10-26" }),
      row({ bookingDate: "2026-10-28" }),
      row({ bookingDate: "2026-10-29" }),
    ];
    expect(evaluatePhoneCaps(input(rows))).toBe("per_shop_upcoming");
  });

  it("blocks once all-shops upcoming reaches the cap", () => {
    const rows = Array.from({ length: PHONE_CAPS.allShopsUpcoming }, (_, i) =>
      row({ shopId: `shop-${i + 10}` }),
    );
    expect(evaluatePhoneCaps(input(rows))).toBe("all_shops_upcoming");
  });

  it("ignores cancelled, completed and past bookings for upcoming caps", () => {
    const rows = [
      row({ status: "cancelled" }),
      row({ status: "completed" }),
      row({ bookingDate: "2026-10-24" }),
    ];
    expect(evaluatePhoneCaps(input(rows))).toBeNull();
  });

  it("counts cancelled rows toward the 24h churn cap", () => {
    const recent = new Date(NOW - 60 * 60 * 1000).toISOString();
    const rows = Array.from({ length: PHONE_CAPS.createdPer24h }, (_, i) =>
      row({ status: "cancelled", createdAt: recent, shopId: `shop-${i}` }),
    );
    expect(evaluatePhoneCaps(input(rows))).toBe("created_per_24h");
  });

  it("drops rows older than 24h from the churn cap", () => {
    const rows = Array.from({ length: PHONE_CAPS.createdPer24h }, (_, i) =>
      row({ status: "cancelled", shopId: `shop-${i}` }),
    );
    expect(evaluatePhoneCaps(input(rows))).toBeNull();
  });

  it("blocks a second active walk-in at the same shop today", () => {
    const rows = [row({ createdBy: "walk_in", bookingDate: TODAY })];
    expect(
      evaluatePhoneCaps(input(rows, { origin: "walk_in", date: TODAY })),
    ).toBe("walk_in_active");
  });

  it("allows a walk-in when the earlier one is done", () => {
    const rows = [row({ createdBy: "walk_in", bookingDate: TODAY, status: "completed" })];
    expect(
      evaluatePhoneCaps(input(rows, { origin: "walk_in", date: TODAY })),
    ).toBeNull();
  });

  it("does not apply the walk-in cap to an online booking", () => {
    const rows = [row({ createdBy: "walk_in", bookingDate: TODAY })];
    expect(evaluatePhoneCaps(input(rows, { date: TODAY }))).toBeNull();
  });
});
