import "server-only";
import type {
  LineFollowEvent,
  LineMessageEvent,
  LinePostbackEvent,
  LineUnfollowEvent,
  LineWebhookEvent,
} from "./types";
import { replyLineMessage } from "./client";
import { parseLinkCommand } from "./link-code";
import { redeemLineLinkCode } from "@/lib/services/line-linking";
import { recordLineMessage } from "@/lib/services/line-log";

/**
 * Inbound webhook event dispatch. SRP: route a LINE event to the right action
 * and craft the (free) reply. This is the open/closed extension seam — OPP-03
 * postback buttons and OPP-17 OTP slot in as new branches here without touching
 * the client, signature, or route. Each event is isolated so one bad event
 * can't sink the batch (LINE delivers events in batches).
 */

const WELCOME_TEXT =
  "ยินดีต้อนรับสู่ queva 🙏 หากต้องการรับแจ้งเตือนคิวผ่าน LINE " +
  "เปิดแอป queva ไปที่ โปรไฟล์ › การแจ้งเตือน แล้วกด “เชื่อม LINE”";

const LINK_HINT_TEXT =
  "หากต้องการเชื่อมบัญชี เปิดแอป queva ที่หน้า โปรไฟล์ › การแจ้งเตือน " +
  "แล้วกด “เชื่อม LINE” เพื่อรับรหัส";

const LINK_SUCCESS_TEXT =
  "เชื่อมบัญชีสำเร็จ ✅ คุณจะได้รับแจ้งเตือนคิวผ่าน LINE นี้";

const NO_USER_TEXT = "ไม่สามารถเชื่อมบัญชีได้ กรุณาลองใหม่จากแอป queva";

export async function dispatchLineEvents(
  events: LineWebhookEvent[],
): Promise<void> {
  for (const event of events) {
    try {
      await handleEvent(event);
    } catch (err) {
      console.error("LINE event handler error:", err);
    }
  }
}

async function handleEvent(event: LineWebhookEvent): Promise<void> {
  switch (event.type) {
    case "follow":
      return handleFollow(event as LineFollowEvent);
    case "message":
      return handleMessage(event as LineMessageEvent);
    case "unfollow":
      // Keep the binding so a re-follow resumes notifications; just record it.
      await recordLineMessage({
        recipient: (event as LineUnfollowEvent).source?.userId ?? "unknown",
        direction: "inbound",
        kind: "unfollow",
        status: "received",
      });
      return;
    case "postback":
      // OPP-03 seam: interactive buttons (กำลังมา/เลื่อน/ยกเลิก) will dispatch
      // off (event as LinePostbackEvent).postback.data here. Stubbed for infra.
      await recordLineMessage({
        recipient: (event as LinePostbackEvent).source?.userId ?? "unknown",
        direction: "inbound",
        kind: "postback",
        status: "received",
      });
      return;
    default:
      return; // tolerate + ignore event types we don't model
  }
}

async function handleFollow(event: LineFollowEvent): Promise<void> {
  await recordLineMessage({
    recipient: event.source?.userId ?? "unknown",
    direction: "inbound",
    kind: "follow",
    status: "received",
  });
  await replyLineMessage(
    event.replyToken,
    [{ type: "text", text: WELCOME_TEXT }],
    { kind: "welcome", recipient: event.source?.userId },
  );
}

async function handleMessage(event: LineMessageEvent): Promise<void> {
  const userId = event.source?.userId;
  const messageId = "id" in event.message ? event.message.id : undefined;
  const text =
    event.message.type === "text" && "text" in event.message
      ? event.message.text
      : "";

  await recordLineMessage({
    recipient: userId ?? "unknown",
    direction: "inbound",
    kind: "message",
    status: "received",
    lineMessageId: messageId ?? null,
    meta: { messageType: event.message.type },
  });

  if (event.message.type !== "text") return;

  const code = parseLinkCommand(text);

  // No code in the text. Only nudge if it looks like a link attempt — don't be
  // chatty (or spend reply effort) on every unrelated message.
  if (!code) {
    if (/เชื่อม|link/i.test(text)) {
      await replyLineMessage(
        event.replyToken,
        [{ type: "text", text: LINK_HINT_TEXT }],
        { kind: "link_hint", recipient: userId },
      );
    }
    return;
  }

  if (!userId) {
    await replyLineMessage(
      event.replyToken,
      [{ type: "text", text: NO_USER_TEXT }],
      { kind: "link_error" },
    );
    return;
  }

  const result = await redeemLineLinkCode(code, userId);
  const replyText = result.ok ? LINK_SUCCESS_TEXT : result.message;

  await replyLineMessage(
    event.replyToken,
    [{ type: "text", text: replyText }],
    { kind: result.ok ? "link_confirm" : "link_error", recipient: userId },
  );
}
