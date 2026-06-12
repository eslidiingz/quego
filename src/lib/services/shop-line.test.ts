import { describe, it, expect } from "vitest";
import {
  formatNewBookingMessage,
  formatBookingCancelledMessage,
  formatBookingRescheduledMessage,
} from "@/lib/services/shop-line";

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

describe("formatBookingCancelledMessage", () => {
  it("states the customer cancelled, with customer + service + DD/MM/YYYY + time", () => {
    const msg = formatBookingCancelledMessage({
      customerName: "สมชาย",
      serviceName: "ตัดผมชาย",
      bookingDate: "2026-06-15",
      slotTime: "14:30",
    });
    expect(msg).toContain("ลูกค้ายกเลิกการจอง");
    expect(msg).toContain("ลูกค้า: สมชาย");
    expect(msg).toContain("บริการ: ตัดผมชาย");
    expect(msg).toContain("15/06/2026");
    expect(msg).toContain("14:30 น.");
  });

  it("omits the service line when serviceName is null", () => {
    const msg = formatBookingCancelledMessage({
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

describe("formatBookingRescheduledMessage", () => {
  it("states the reschedule with customer, service, and both จาก → เป็น datetimes", () => {
    const msg = formatBookingRescheduledMessage({
      customerName: "นิก",
      serviceName: "ตัดผมชาย",
      fromDate: "2026-06-12",
      fromSlotTime: "20:30",
      toDate: "2026-06-12",
      toSlotTime: "21:00",
    });
    expect(msg).toContain("ลูกค้าเลื่อนเวลา");
    expect(msg).toContain("ลูกค้า: นิก");
    expect(msg).toContain("บริการ: ตัดผมชาย");
    expect(msg).toContain("จาก: 12/06/2026 20:30 น.");
    expect(msg).toContain("เป็น: 12/06/2026 21:00 น.");
  });

  it("omits the service line when serviceName is null", () => {
    const msg = formatBookingRescheduledMessage({
      customerName: "ก",
      serviceName: null,
      fromDate: "2026-01-02",
      fromSlotTime: "09:00",
      toDate: "2026-01-03",
      toSlotTime: "10:30",
    });
    expect(msg).not.toContain("บริการ:");
    expect(msg).toContain("จาก: 02/01/2026 09:00 น.");
    expect(msg).toContain("เป็น: 03/01/2026 10:30 น.");
  });
});
