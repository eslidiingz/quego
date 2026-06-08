import { describe, it, expect } from "vitest";
import { formatNewBookingMessage } from "@/lib/services/shop-line";

describe("formatNewBookingMessage", () => {
  it("includes the heading, customer, service, and DD/MM/YYYY date + time", () => {
    const msg = formatNewBookingMessage({
      customerName: "สมชาย",
      serviceName: "ตัดผมชาย",
      bookingDate: "2026-06-15",
      slotTime: "14:30",
    });
    expect(msg).toContain("มีการจองใหม่");
    expect(msg).toContain("ลูกค้า: สมชาย");
    expect(msg).toContain("บริการ: ตัดผมชาย");
    expect(msg).toContain("15/06/2026");
    expect(msg).toContain("14:30 น.");
  });

  it("omits the service line when serviceName is null", () => {
    const msg = formatNewBookingMessage({
      customerName: "ก",
      serviceName: null,
      bookingDate: "2026-01-02",
      slotTime: "09:00",
    });
    expect(msg).not.toContain("บริการ:");
    expect(msg).toContain("02/01/2026");
    expect(msg).toContain("09:00 น.");
  });
});
