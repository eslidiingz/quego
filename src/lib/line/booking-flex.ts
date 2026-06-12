/**
 * LINE Flex Message builders for booking interactions (OPP-03). SRP: turn
 * booking facts into the flex bubbles we push — the booking confirmation with
 * its interactive กำลังมา / ขอเลื่อน / ยกเลิก buttons, and the two-step in-chat
 * "confirm cancel" bubble. No DB, no channel: the customer-side service
 * (line-linking.ts) and the postback handler (services/line-booking-actions.ts)
 * inject the facts.
 *
 * Deliberately imports only the PURE format/url helpers (never line-linking),
 * so there's no import cycle with the service that calls it.
 *
 * Postback `data` contract: `act=<action>&b=<bookingId>` (the keep action has no
 * booking). The webhook (lib/line/events.ts → services/line-booking-actions.ts)
 * parses it and RE-VERIFIES ownership before acting — the bookingId in a
 * postback is never trusted on its own.
 */
import type { LineFlexMessage } from "@/lib/line/client";
import { buildBookingMessage, formatBookingDate } from "@/lib/line/format";
import { absoluteUrl } from "@/lib/url";

export type BookingConfirmationFlexInput = {
  bookingId: string;
  shopName: string;
  serviceName: string | null;
  bookingDate: string; // "YYYY-MM-DD"
  slotTime: string; // "HH:MM"
};

const TEXT_MUTED = "#6B6B6B";
const TEXT_STRONG = "#1A1A1A";
const BRAND = "#1F7A3D"; // success-leaning green for the primary "กำลังมา"
const DANGER = "#C0392B";

/** A label/value baseline row used in the bubble body. */
function detailLine(label: string, value: string): unknown {
  return {
    type: "box",
    layout: "baseline",
    spacing: "sm",
    contents: [
      { type: "text", text: label, size: "sm", color: TEXT_MUTED, flex: 2 },
      {
        type: "text",
        text: value,
        size: "sm",
        color: TEXT_STRONG,
        wrap: true,
        flex: 5,
      },
    ],
  };
}

/**
 * Booking-confirmation bubble with the three action buttons. "ขอเลื่อนเวลา" is
 * a URI button straight to the web reschedule page (slot picking needs the
 * picker); "กำลังมา" and "ยกเลิกคิว" are postbacks handled in-chat.
 */
export function buildBookingConfirmationFlex(
  notice: BookingConfirmationFlexInput,
): LineFlexMessage {
  const altText = buildBookingMessage({
    heading: "✅ ยืนยันการจอง",
    identityLine: `ร้าน: ${notice.shopName}`,
    serviceName: notice.serviceName,
    bookingDate: notice.bookingDate,
    slotTime: notice.slotTime,
  });
  const rescheduleUrl = absoluteUrl(`/bookings/${notice.bookingId}/reschedule`);

  const detailRows: unknown[] = [];
  if (notice.serviceName) detailRows.push(detailLine("บริการ", notice.serviceName));
  detailRows.push(
    detailLine("วันเวลา", `${formatBookingDate(notice.bookingDate)} ${notice.slotTime} น.`),
  );

  return {
    type: "flex",
    altText,
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          {
            type: "text",
            text: "✅ ยืนยันการจอง",
            weight: "bold",
            size: "lg",
            color: TEXT_STRONG,
          },
          {
            type: "text",
            text: notice.shopName,
            weight: "bold",
            size: "md",
            color: BRAND,
            wrap: true,
          },
          { type: "separator", margin: "md" },
          { type: "box", layout: "vertical", margin: "md", spacing: "sm", contents: detailRows },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          {
            type: "button",
            style: "primary",
            height: "sm",
            color: BRAND,
            action: {
              type: "postback",
              label: "🚶 กำลังมา",
              data: `act=coming&b=${notice.bookingId}`,
              displayText: "กำลังมาแล้ว",
            },
          },
          {
            type: "button",
            style: "secondary",
            height: "sm",
            action: { type: "uri", label: "🕓 ขอเลื่อนเวลา", uri: rescheduleUrl },
          },
          {
            type: "button",
            style: "secondary",
            height: "sm",
            action: {
              type: "postback",
              label: "✖ ยกเลิกคิว",
              data: `act=cancel&b=${notice.bookingId}`,
              displayText: "ขอยกเลิกคิว",
            },
          },
        ],
      },
    },
  };
}

// ----- Shop-facing notification bubble ------------------------------------

export type ShopFlexDetailRow = { label: string; value: string };

export type ShopNotificationFlexInput = {
  /**
   * Notification-preview text + non-flex fallback — pass the existing plain-text
   * body (formatNewBookingMessage, …) so the flex and the preview never drift.
   */
  altText: string;
  /** First line, e.g. "🔔 มีการจองใหม่". */
  heading: string;
  /** Accent color for the identity line (green / red / amber by event). */
  accentColor: string;
  /** Who the booking is for — shown bold in the accent color (the customer). */
  customerName: string;
  /** Label/value rows under the separator (บริการ, วันเวลา, จาก, เป็น, …). */
  rows: ShopFlexDetailRow[];
  /** Optional single CTA that deep-links into the shop app. */
  cta?: { label: string; uri: string };
};

/**
 * The standard service + datetime rows shared by most shop notices. Reschedule
 * (จาก → เป็น) composes its own rows instead, so this stays the single-datetime
 * shape. Pure; mirrors the row set the customer confirmation bubble builds.
 */
export function bookingDetailRows(
  serviceName: string | null,
  bookingDate: string,
  slotTime: string,
): ShopFlexDetailRow[] {
  const rows: ShopFlexDetailRow[] = [];
  if (serviceName) rows.push({ label: "บริการ", value: serviceName });
  rows.push({
    label: "วันเวลา",
    value: `${formatBookingDate(bookingDate)} ${slotTime} น.`,
  });
  return rows;
}

/**
 * Shop-facing notification bubble — the visual twin of the customer's
 * buildBookingConfirmationFlex (heading · accent identity line · separator ·
 * detail rows), so a shop's LINE alerts read as the same product the customer
 * sees. Presentation only: the caller (services/shop-line.ts) owns each event's
 * heading, accent, rows, and altText. The optional CTA is a neutral secondary
 * button (it never competes with the event accent) linking into the shop app.
 */
export function buildShopNotificationFlex(
  input: ShopNotificationFlexInput,
): LineFlexMessage {
  const bubble: Record<string, unknown> = {
    type: "bubble",
    body: {
      type: "box",
      layout: "vertical",
      spacing: "sm",
      contents: [
        {
          type: "text",
          text: input.heading,
          weight: "bold",
          size: "lg",
          color: TEXT_STRONG,
        },
        {
          type: "text",
          // A flex text node rejects an empty string (silent 400); the name is
          // validated non-empty upstream, but fall back defensively.
          text: input.customerName.trim() || "ลูกค้า",
          weight: "bold",
          size: "md",
          color: input.accentColor,
          wrap: true,
        },
        { type: "separator", margin: "md" },
        {
          type: "box",
          layout: "vertical",
          margin: "md",
          spacing: "sm",
          contents: input.rows.map((r) => detailLine(r.label, r.value)),
        },
      ],
    },
  };

  if (input.cta) {
    bubble.footer = {
      type: "box",
      layout: "vertical",
      spacing: "sm",
      contents: [
        {
          type: "button",
          style: "secondary",
          height: "sm",
          action: { type: "uri", label: input.cta.label, uri: input.cta.uri },
        },
      ],
    };
  }

  return { type: "flex", altText: input.altText, contents: bubble };
}

/**
 * The two-step in-chat cancel confirmation bubble — shown in reply to the
 * "ยกเลิกคิว" tap so one accidental tap can't drop a queue. "ยืนยันยกเลิก" →
 * act=cancelyes; "เก็บคิวไว้" → act=keep.
 */
export function buildCancelConfirmFlex(bookingId: string): LineFlexMessage {
  return {
    type: "flex",
    altText: "ยืนยันการยกเลิกคิว?",
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          {
            type: "text",
            text: "ยืนยันการยกเลิกคิว?",
            weight: "bold",
            size: "lg",
            color: TEXT_STRONG,
          },
          {
            type: "text",
            text: "เมื่อยืนยันแล้ว คิวนี้จะถูกปลดออกและกู้คืนไม่ได้",
            size: "sm",
            color: TEXT_MUTED,
            wrap: true,
          },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          {
            type: "button",
            style: "primary",
            height: "sm",
            color: DANGER,
            action: {
              type: "postback",
              label: "ยืนยันยกเลิก",
              data: `act=cancelyes&b=${bookingId}`,
              displayText: "ยืนยันยกเลิกคิว",
            },
          },
          {
            type: "button",
            style: "secondary",
            height: "sm",
            action: {
              type: "postback",
              label: "เก็บคิวไว้",
              data: "act=keep",
              displayText: "เก็บคิวไว้",
            },
          },
        ],
      },
    },
  };
}
