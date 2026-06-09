import { describe, it, expect } from "vitest";
import { parseBookingPostback } from "@/lib/services/line-booking-actions";

const UUID = "550e8400-e29b-41d4-a716-446655440000";

describe("parseBookingPostback — mutating actions with a valid UUID", () => {
  it("parses act=coming with a valid bookingId", () => {
    expect(parseBookingPostback(`act=coming&b=${UUID}`)).toEqual({
      act: "coming",
      bookingId: UUID,
    });
  });

  it("parses act=cancel with a valid bookingId", () => {
    expect(parseBookingPostback(`act=cancel&b=${UUID}`)).toEqual({
      act: "cancel",
      bookingId: UUID,
    });
  });

  it("parses act=cancelyes with a valid bookingId", () => {
    expect(parseBookingPostback(`act=cancelyes&b=${UUID}`)).toEqual({
      act: "cancelyes",
      bookingId: UUID,
    });
  });

  it("accepts an uppercase UUID (regex is case-insensitive)", () => {
    const upper = UUID.toUpperCase();
    expect(parseBookingPostback(`act=coming&b=${upper}`)).toEqual({
      act: "coming",
      bookingId: upper,
    });
  });

  it("ignores extra params beyond act and b", () => {
    expect(parseBookingPostback(`act=coming&b=${UUID}&x=1`)).toEqual({
      act: "coming",
      bookingId: UUID,
    });
  });
});

describe("parseBookingPostback — the keep action", () => {
  it("parses act=keep with no bookingId at all", () => {
    expect(parseBookingPostback("act=keep")).toEqual({ act: "keep" });
  });

  it("parses act=keep and ignores any b value (valid UUID)", () => {
    expect(parseBookingPostback(`act=keep&b=${UUID}`)).toEqual({ act: "keep" });
  });

  it("parses act=keep even when b is junk", () => {
    expect(parseBookingPostback("act=keep&b=not-a-uuid")).toEqual({
      act: "keep",
    });
  });
});

describe("parseBookingPostback — IDOR guard: malformed bookingId is rejected", () => {
  it("rejects a numeric bookingId", () => {
    expect(parseBookingPostback("act=coming&b=123")).toBeNull();
  });

  it("rejects a non-UUID string", () => {
    expect(parseBookingPostback("act=cancel&b=not-a-uuid")).toBeNull();
  });

  it("rejects a path-traversal payload as bookingId", () => {
    expect(
      parseBookingPostback("act=cancelyes&b=../../etc/passwd"),
    ).toBeNull();
  });

  it("rejects an empty b value", () => {
    expect(parseBookingPostback("act=coming&b=")).toBeNull();
  });

  it("rejects a missing b param entirely", () => {
    expect(parseBookingPostback("act=coming")).toBeNull();
  });
});

describe("parseBookingPostback — unknown or spoofed actions are rejected", () => {
  it("rejects an unmodeled action even with a valid UUID", () => {
    expect(parseBookingPostback(`act=delete&b=${UUID}`)).toBeNull();
  });

  it("rejects an empty act value with a valid UUID", () => {
    expect(parseBookingPostback(`act=&b=${UUID}`)).toBeNull();
  });

  it("rejects an entirely empty postback string", () => {
    expect(parseBookingPostback("")).toBeNull();
  });
});
