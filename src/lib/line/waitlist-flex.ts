/**
 * LINE Flex Message builder for the waitlist "a slot just opened" push (OPP-05).
 * SRP: turn the freed-slot facts into the bubble we push, with a single primary
 * "จองเลย" URI button deep-linking back into the booking form (prefilled to the
 * service + date). No DB, no channel — the waitlist service (services/waitlist.ts)
 * injects the facts and the customer-side push wrapper (services/line-linking.ts)
 * sends it.
 *
 * Unlike booking-flex's confirmation bubble, the claim is a plain web deep link
 * (not a postback): the freed slot stays openly bookable and the customer
 * completes the normal, race-safe booking flow — so no webhook postback handler
 * is involved here.
 *
 * Imports only the PURE format/url helpers (never line-linking), so there's no
 * import cycle with the service that calls it.
 */
import type { LineFlexMessage } from "@/lib/line/client";
import { formatBookingDate } from "@/lib/line/format";
import { absoluteUrl } from "@/lib/url";

export type WaitlistSlotOpenFlexInput = {
  shopId: string;
  shopName: string;
  serviceName: string;
  serviceId: string;
  preferredStaffId: string | null;
  date: string; // "YYYY-MM-DD"
};

const TEXT_MUTED = "#6B6B6B";
const TEXT_STRONG = "#1A1A1A";
const BRAND = "#1F7A3D";

/** A label/value baseline row used in the bubble body. */
function detailLine(label: string, value: string): unknown {
  return {
    type: "box",
    layout: "baseline",
    spacing: "sm",
    contents: [
      { type: "text", text: label, size: "sm", color: TEXT_MUTED, flex: 2 },
      { type: "text", text: value, size: "sm", color: TEXT_STRONG, wrap: true, flex: 5 },
    ],
  };
}

/** The booking-form deep link prefilled to a waitlist entry's service + date. */
export function buildWaitlistBookUrl(input: WaitlistSlotOpenFlexInput): string {
  const params = new URLSearchParams({ serviceId: input.serviceId, date: input.date });
  if (input.preferredStaffId) params.set("staffId", input.preferredStaffId);
  return absoluteUrl(`/shops/${input.shopId}/book?${params.toString()}`);
}

/**
 * "🔔 มีคิวว่างแล้ว!" bubble: shop + service + date facts and a primary "จองเลย"
 * button. The altText (notification preview + non-flex clients) carries the same
 * facts plus the link, so the message is useful even where flex doesn't render.
 */
export function buildWaitlistSlotOpenFlex(
  input: WaitlistSlotOpenFlexInput,
): LineFlexMessage {
  const bookUrl = buildWaitlistBookUrl(input);
  const altText = [
    "🔔 มีคิวว่างแล้ว!",
    `ร้าน: ${input.shopName}`,
    `บริการ: ${input.serviceName}`,
    `วันที่ ${formatBookingDate(input.date)} — รีบจองก่อนถูกจองใหม่: ${bookUrl}`,
  ].join("\n");

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
            text: "🔔 มีคิวว่างแล้ว!",
            weight: "bold",
            size: "lg",
            color: TEXT_STRONG,
          },
          {
            type: "text",
            text: input.shopName,
            weight: "bold",
            size: "md",
            color: BRAND,
            wrap: true,
          },
          { type: "separator", margin: "md" },
          {
            type: "box",
            layout: "vertical",
            margin: "md",
            spacing: "sm",
            contents: [
              detailLine("บริการ", input.serviceName),
              detailLine("วันที่", formatBookingDate(input.date)),
            ],
          },
          {
            type: "text",
            text: "คิวว่างนี้เปิดให้ทุกคนจอง รีบจองก่อนถูกจองใหม่นะ",
            size: "xs",
            color: TEXT_MUTED,
            wrap: true,
            margin: "md",
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
            color: BRAND,
            action: { type: "uri", label: "📅 จองเลย", uri: bookUrl },
          },
        ],
      },
    },
  };
}
