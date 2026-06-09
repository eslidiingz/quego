import { describe, it, expect } from "vitest";
import {
  buildBookingConfirmationFlex,
  buildCancelConfirmFlex,
} from "@/lib/line/booking-flex";
import { parseBookingPostback } from "@/lib/services/line-booking-actions";

// A real UUID so the postback round-trips through the parser's UUID_RE.
const BOOKING_ID = "11111111-2222-4333-8444-555555555555";

// Minimal structural view of the flex-bubble parts the tests inspect — lets us
// traverse the LINE flex JSON without `any` (cast through `unknown`).
type FlexAction = { type: string; label: string; data: string; uri: string };
type FlexNode = {
  type: string;
  text: string;
  contents: FlexNode[];
  action: FlexAction;
};
type FlexBubble = { type: string; body: FlexNode; footer: FlexNode };

/** Pull the footer button list out of a confirmation/cancel bubble. */
function footerButtons(
  msg: ReturnType<typeof buildCancelConfirmFlex>,
): FlexNode[] {
  return (msg.contents as unknown as FlexBubble).footer.contents;
}

/** Pull the body detail rows (the inner vertical box) out of a bubble. */
function detailRows(
  msg: ReturnType<typeof buildBookingConfirmationFlex>,
): FlexNode[] {
  const bodyContents = (msg.contents as unknown as FlexBubble).body.contents;
  const detailBox = bodyContents[bodyContents.length - 1];
  return detailBox.contents;
}

describe("buildBookingConfirmationFlex", () => {
  const input = {
    bookingId: BOOKING_ID,
    shopName: "ร้านตัดผมโจ",
    serviceName: "ตัดผมชาย",
    bookingDate: "2026-06-15",
    slotTime: "14:30",
  };

  it("returns a flex message whose altText names the shop", () => {
    const msg = buildBookingConfirmationFlex(input);
    expect(msg.type).toBe("flex");
    expect(msg.altText).toContain("ร้านตัดผมโจ");
    expect((msg.contents as unknown as FlexBubble).type).toBe("bubble");
  });

  it("puts the three action buttons in order: coming, reschedule, cancel", () => {
    const buttons = footerButtons(buildBookingConfirmationFlex(input));
    expect(buttons).toHaveLength(3);

    const [coming, reschedule, cancel] = buttons;

    expect(coming.action.type).toBe("postback");
    expect(coming.action.label).toBe("🚶 กำลังมา");
    expect(coming.action.data).toBe(`act=coming&b=${BOOKING_ID}`);

    expect(reschedule.action.type).toBe("uri");
    expect(reschedule.action.label).toBe("🕓 ขอเลื่อนเวลา");

    expect(cancel.action.type).toBe("postback");
    expect(cancel.action.label).toBe("✖ ยกเลิกคิว");
    expect(cancel.action.data).toBe(`act=cancel&b=${BOOKING_ID}`);
  });

  it("points the reschedule URI at the web reschedule page for this booking", () => {
    const [, reschedule] = footerButtons(buildBookingConfirmationFlex(input));
    // Origin comes from env/absoluteUrl, so assert the suffix only.
    expect(reschedule.action.uri).toMatch(/^https?:\/\//);
    expect(reschedule.action.uri.endsWith(`/bookings/${BOOKING_ID}/reschedule`)).toBe(
      true,
    );
  });

  it("includes a บริการ detail row when serviceName is provided", () => {
    const rows = detailRows(buildBookingConfirmationFlex(input));
    const labels = rows.map((r) => r.contents[0].text);
    expect(labels).toContain("บริการ");
    expect(labels).toContain("วันเวลา");
    const serviceRow = rows.find((r) => r.contents[0].text === "บริการ");
    expect(serviceRow.contents[1].text).toBe("ตัดผมชาย");
  });

  it("omits the บริการ row when serviceName is null but always keeps วันเวลา", () => {
    const rows = detailRows(
      buildBookingConfirmationFlex({ ...input, serviceName: null }),
    );
    const labels = rows.map((r) => r.contents[0].text);
    expect(labels).not.toContain("บริการ");
    expect(labels).toContain("วันเวลา");
  });

  it("formats the วันเวลา row as DD/MM/YYYY HH:MM น.", () => {
    const rows = detailRows(buildBookingConfirmationFlex(input));
    const dateRow = rows.find((r) => r.contents[0].text === "วันเวลา");
    expect(dateRow.contents[1].text).toBe("15/06/2026 14:30 น.");
  });
});

describe("buildCancelConfirmFlex", () => {
  it("uses the cancel-confirmation altText prompt", () => {
    const msg = buildCancelConfirmFlex(BOOKING_ID);
    expect(msg.type).toBe("flex");
    expect(msg.altText).toBe("ยืนยันการยกเลิกคิว?");
  });

  it("offers exactly two buttons: confirm-cancel and keep", () => {
    const buttons = footerButtons(buildCancelConfirmFlex(BOOKING_ID));
    expect(buttons).toHaveLength(2);

    const [confirm, keep] = buttons;

    expect(confirm.action.label).toBe("ยืนยันยกเลิก");
    expect(confirm.action.data).toBe(`act=cancelyes&b=${BOOKING_ID}`);

    expect(keep.action.label).toBe("เก็บคิวไว้");
    expect(keep.action.data).toBe("act=keep");
  });
});

describe("postback data round-trips through parseBookingPostback (IDOR contract)", () => {
  it("the กำลังมา button parses back to a coming action for this booking", () => {
    const [coming] = footerButtons(
      buildBookingConfirmationFlex({
        bookingId: BOOKING_ID,
        shopName: "ร้านโจ",
        serviceName: null,
        bookingDate: "2026-06-15",
        slotTime: "14:30",
      }),
    );
    expect(parseBookingPostback(coming.action.data)).toEqual({
      act: "coming",
      bookingId: BOOKING_ID,
    });
  });

  it("the ยกเลิกคิว button parses back to a cancel action for this booking", () => {
    const buttons = footerButtons(
      buildBookingConfirmationFlex({
        bookingId: BOOKING_ID,
        shopName: "ร้านโจ",
        serviceName: null,
        bookingDate: "2026-06-15",
        slotTime: "14:30",
      }),
    );
    const cancel = buttons[2];
    expect(parseBookingPostback(cancel.action.data)).toEqual({
      act: "cancel",
      bookingId: BOOKING_ID,
    });
  });

  it("the confirm-cancel button parses back to a cancelyes action", () => {
    const [confirm] = footerButtons(buildCancelConfirmFlex(BOOKING_ID));
    expect(parseBookingPostback(confirm.action.data)).toEqual({
      act: "cancelyes",
      bookingId: BOOKING_ID,
    });
  });

  it("the keep button parses back to a keep action with no booking", () => {
    const [, keep] = footerButtons(buildCancelConfirmFlex(BOOKING_ID));
    expect(parseBookingPostback(keep.action.data)).toEqual({ act: "keep" });
  });
});
