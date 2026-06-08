import { describe, it, expect } from "vitest";
import { formatBookingConfirmationMessage } from "@/lib/services/line-linking";

describe("formatBookingConfirmationMessage", () => {
  it("includes the heading, shop, service, and DD/MM/YYYY date + time", () => {
    const msg = formatBookingConfirmationMessage({
      shopName: "ร้านตัดผมลุงโจ",
      serviceName: "ตัดผมชาย",
      bookingDate: "2026-06-15",
      slotTime: "14:30",
    });
    expect(msg).toContain("ยืนยันการจอง");
    expect(msg).toContain("ร้าน: ร้านตัดผมลุงโจ");
    expect(msg).toContain("บริการ: ตัดผมชาย");
    expect(msg).toContain("15/06/2026");
    expect(msg).toContain("14:30 น.");
  });

  it("omits the service line when serviceName is null", () => {
    const msg = formatBookingConfirmationMessage({
      shopName: "ร้าน ก",
      serviceName: null,
      bookingDate: "2026-01-02",
      slotTime: "09:00",
    });
    expect(msg).not.toContain("บริการ:");
    expect(msg).toContain("02/01/2026");
    expect(msg).toContain("09:00 น.");
  });
});
