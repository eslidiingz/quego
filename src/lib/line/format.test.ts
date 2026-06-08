import { describe, it, expect } from "vitest";
import { buildBookingMessage, formatBookingDate } from "@/lib/line/format";

describe("formatBookingDate", () => {
  it("reshapes YYYY-MM-DD to DD/MM/YYYY without locale dependence", () => {
    expect(formatBookingDate("2026-06-15")).toBe("15/06/2026");
    expect(formatBookingDate("2026-01-02")).toBe("02/01/2026");
  });
});

describe("buildBookingMessage", () => {
  it("stacks heading, identity, service, and date+time lines in order", () => {
    const msg = buildBookingMessage({
      heading: "🔔 มีการจองใหม่",
      identityLine: "ลูกค้า: สมชาย",
      serviceName: "ตัดผมชาย",
      bookingDate: "2026-06-15",
      slotTime: "14:30",
    });
    expect(msg).toBe(
      ["🔔 มีการจองใหม่", "ลูกค้า: สมชาย", "บริการ: ตัดผมชาย", "วันเวลา: 15/06/2026 14:30 น."].join(
        "\n",
      ),
    );
  });

  it("omits the service line when serviceName is null", () => {
    const msg = buildBookingMessage({
      heading: "✅ ยืนยันการจอง",
      identityLine: "ร้าน: ร้าน ก",
      serviceName: null,
      bookingDate: "2026-01-02",
      slotTime: "09:00",
    });
    expect(msg).not.toContain("บริการ:");
    expect(msg).toBe(["✅ ยืนยันการจอง", "ร้าน: ร้าน ก", "วันเวลา: 02/01/2026 09:00 น."].join("\n"));
  });
});
