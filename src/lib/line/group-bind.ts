/**
 * Pure helpers for the "overwrite an existing group binding?" confirmation.
 * NO `server-only` import (unit-tested). The postback `data` carries only the
 * action — the groupId and the sender come from the verified event source, and
 * the shop is re-derived from the sender's LINE userId, so a forged or replayed
 * payload can't bind anything the presser doesn't own.
 */
import type { LineFlexMessage } from "@/lib/line/client";

export const GROUP_BIND_CONFIRM_DATA = "act=bindgroup";
export const GROUP_BIND_KEEP_DATA = "act=bindkeep";

export type GroupBindPostback = "confirm" | "keep";

export function parseGroupBindPostback(data: string): GroupBindPostback | null {
  const act = new URLSearchParams(data).get("act");
  if (act === "bindgroup") return "confirm";
  if (act === "bindkeep") return "keep";
  return null;
}

/** Two-button bubble asking before the shop's notification group is replaced. */
export function buildGroupBindConfirmFlex(shopName: string): LineFlexMessage {
  const text = `ร้าน “${shopName}” เชื่อมกับกลุ่มอื่นอยู่แล้ว — ต้องการเปลี่ยนมาใช้กลุ่มนี้แทนไหม? แจ้งเตือนการจองจะย้ายมาที่กลุ่มนี้`;
  return {
    type: "flex",
    altText: text,
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        contents: [
          { type: "text", text: "เปลี่ยนกลุ่มแจ้งเตือน?", weight: "bold", size: "md" },
          { type: "text", text, wrap: true, size: "sm", color: "#555555" },
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
            action: {
              type: "postback",
              label: "เปลี่ยนมากลุ่มนี้",
              data: GROUP_BIND_CONFIRM_DATA,
            },
          },
          {
            type: "button",
            style: "secondary",
            height: "sm",
            action: {
              type: "postback",
              label: "ไม่เปลี่ยน",
              data: GROUP_BIND_KEEP_DATA,
            },
          },
        ],
      },
    },
  };
}
