import "server-only";
import type {
  LineFollowEvent,
  LineMessageEvent,
  LinePostbackEvent,
  LineUnfollowEvent,
  LineWebhookEvent,
} from "./types";
import { replyLineMessage } from "./client";
import { recordLineMessage } from "@/lib/services/line-log";
import {
  parseBookingPostback,
  handleBookingPostback,
} from "@/lib/services/line-booking-actions";

/**
 * Inbound webhook event dispatch. SRP: route a LINE event to the right action
 * and craft the (free) reply. This is the open/closed extension seam — OPP-03
 * postback buttons and OPP-17 OTP slot in as new branches here without touching
 * the client, signature, or route. Each event is isolated so one bad event
 * can't sink the batch (LINE delivers events in batches).
 *
 * Account linking is NOT done from this chat: both personas connect via the LINE
 * Login OAuth flow in the app (see lib/line/oauth.ts), so the message handler
 * only welcomes/guides — there is no code to redeem here.
 */

const WELCOME_TEXT =
  "ยินดีต้อนรับสู่ queva 🙏 หากต้องการรับแจ้งเตือนผ่าน LINE " +
  "เปิดแอป queva ไปที่ โปรไฟล์ › การแจ้งเตือน แล้วกด “เชื่อมต่อ LINE”";

const LINK_HINT_TEXT =
  "การเชื่อมบัญชีทำได้จากในแอป queva ที่หน้า โปรไฟล์ › การแจ้งเตือน " +
  "แล้วกด “เชื่อมต่อ LINE”";

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
      return handlePostback(event as LinePostbackEvent);
    default:
      return; // tolerate + ignore event types we don't model
  }
}

/**
 * OPP-03 — booking action buttons. Record the inbound postback, then resolve +
 * dispatch it (gated on a userId). The heavy lifting — ownership re-check, the
 * mutation, and the reply — lives in services/line-booking-actions.ts so this
 * file stays a thin router.
 */
async function handlePostback(event: LinePostbackEvent): Promise<void> {
  const userId = event.source?.userId;
  await recordLineMessage({
    recipient: userId ?? "unknown",
    direction: "inbound",
    kind: "postback",
    status: "received",
    meta: { data: event.postback.data },
  });
  if (!userId) return;
  const parsed = parseBookingPostback(event.postback.data);
  if (!parsed) return;
  await handleBookingPostback(parsed, userId, event.replyToken);
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

  // Linking happens via OAuth in the app, not here. Only nudge if the message
  // looks like a link attempt — don't be chatty (or spend reply effort) on
  // every unrelated message.
  if (/เชื่อม|link/i.test(text)) {
    await replyLineMessage(
      event.replyToken,
      [{ type: "text", text: LINK_HINT_TEXT }],
      { kind: "link_hint", recipient: userId },
    );
  }
}
