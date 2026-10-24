import "server-only";
import type {
  LineEventMeta,
  LineFollowEvent,
  LineJoinEvent,
  LineMessageEvent,
  LinePostbackEvent,
  LineUnfollowEvent,
  LineWebhookEvent,
} from "./types";
import { replyLineMessage } from "./client";
import { classifyLineTextCommand, shouldLogInboundMessage } from "./message-commands";
import { claimLineWebhookEvent, recordLineMessage } from "@/lib/services/line-log";
import { isStaleLineEvent, webhookEventKey } from "./webhook-guard";
import { buildGroupBindConfirmFlex, parseGroupBindPostback } from "./group-bind";
import {
  parseBookingPostback,
  handleBookingPostback,
} from "@/lib/services/line-booking-actions";
import {
  bindShopLineGroupBySender,
  notifyOwnerGroupChange,
  unbindShopLineGroupBySender,
} from "@/lib/services/shop-line";

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
  "ยินดีต้อนรับสู่ Quego 🙏 หากต้องการรับแจ้งเตือนผ่าน LINE " +
  "เปิดแอป Quego ไปที่ โปรไฟล์ › การแจ้งเตือน แล้วกด “เชื่อมต่อ LINE”";

const LINK_HINT_TEXT =
  "การเชื่อมบัญชีทำได้จากในแอป Quego ที่หน้า โปรไฟล์ › การแจ้งเตือน " +
  "แล้วกด “เชื่อมต่อ LINE”";

export async function dispatchLineEvents(
  events: LineWebhookEvent[],
): Promise<void> {
  for (const event of events) {
    try {
      if (!(await shouldProcess(event))) continue;
      await handleEvent(event);
    } catch (err) {
      console.error("LINE event handler error:", err);
    }
  }
}

/**
 * Replay guard (audit L3). The signature only proves LINE sent the body once; a
 * captured body could otherwise be re-POSTed to re-run "เชื่อมร้าน" forever.
 * Drop events older than 5 minutes, then claim the webhookEventId insert-first
 * so a redelivery/replay of the same event is handled at most once.
 */
async function shouldProcess(event: LineWebhookEvent): Promise<boolean> {
  const meta = event as LineEventMeta;
  if (isStaleLineEvent(meta.timestamp)) {
    console.warn("[LINE webhook] dropped stale event", event.type, meta.timestamp);
    return false;
  }
  const key = webhookEventKey(meta.webhookEventId);
  if (!key) return true; // tolerate payloads without an id (timestamp still bounds them)
  const claimed = await claimLineWebhookEvent(key, {
    type: event.type,
    isRedelivery: meta.deliveryContext?.isRedelivery ?? false,
  });
  if (!claimed) console.info("[LINE webhook] skipped duplicate event", key);
  return claimed;
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
    case "join":
      return handleJoin(event as LineJoinEvent);
    default:
      return; // tolerate + ignore event types we don't model
  }
}

/**
 * Fired when the OA is added to a group/room. Record the groupId (observable in
 * line_message_log) and prompt the owner to bind this group to their shop. The
 * actual binding is sender-match: the owner types "เชื่อมร้าน" and we resolve
 * their shop from the sender userId (see handleMessage's group branch).
 */
async function handleJoin(event: LineJoinEvent): Promise<void> {
  const groupId = event.source?.groupId ?? event.source?.roomId;
  console.info("[LINE join] OA added to chat — groupId:", groupId);
  await recordLineMessage({
    recipient: groupId ?? "unknown",
    direction: "inbound",
    kind: "join",
    status: "received",
    meta: { source: event.source },
  });
  if (!groupId) return;
  await replyLineMessage(
    event.replyToken,
    [
      {
        type: "text",
        text:
          "สวัสดีค่ะ 🙏 Quego พร้อมส่งแจ้งเตือนการจองเข้ากลุ่มนี้\n\n" +
          "เจ้าของร้านพิมพ์ “เชื่อมร้าน” ในกลุ่มนี้เพื่อผูกกับร้านของคุณ " +
          "(ต้องเชื่อมต่อ LINE ส่วนตัวกับร้านในแอป Quego ก่อน)",
      },
    ],
    { kind: "group_join", recipient: groupId },
  );
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
  const groupAct = parseGroupBindPostback(event.postback.data);
  if (groupAct) {
    const groupId = event.source?.groupId ?? event.source?.roomId;
    if (!groupId) return;
    if (groupAct === "keep") {
      await replyText(event.replyToken, "ไม่เปลี่ยน — แจ้งเตือนยังส่งไปกลุ่มเดิม", groupId);
      return;
    }
    await bindGroupAndReply(userId, groupId, event.replyToken, true);
    return;
  }
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
  const groupId = event.source?.groupId ?? event.source?.roomId;
  const messageId = "id" in event.message ? event.message.id : undefined;
  const text =
    event.message.type === "text" && "text" in event.message
      ? event.message.text
      : "";

  // Pure routing decision (tested in message-commands.test.ts) — the dispatcher
  // below only carries out the side effects for whichever command it names.
  // Non-text messages classify as "none".
  const command = classifyLineTextCommand(text, Boolean(groupId));

  if (shouldLogInboundMessage(command, Boolean(groupId))) {
    await recordLineMessage({
      recipient: groupId ?? userId ?? "unknown",
      direction: "inbound",
      kind: "message",
      status: "received",
      lineMessageId: messageId ?? null,
      meta: { messageType: event.message.type, source: event.source.type },
    });
  }

  if (event.message.type !== "text") return;

  // In a group/room the bot must stay quiet on normal chatter — never run the
  // link-hint here (it would fire on staff conversation). Only echo the groupId
  // on an explicit request, as a recovery path when the join event was missed.
  if (groupId) {
    // "เชื่อมร้าน" / "ยกเลิกเชื่อมร้าน" — sender-match against the shop owner.
    if (command === "group_bind" || command === "group_unbind") {
      const senderUserId = event.source?.userId;
      if (!senderUserId) {
        await replyText(
          event.replyToken,
          "ไม่พบบัญชีผู้ส่ง — โปรดเพิ่ม Quego เป็นเพื่อนใน LINE ก่อน แล้วลองอีกครั้ง",
          groupId,
        );
        return;
      }
      if (command === "group_bind") {
        await bindGroupAndReply(senderUserId, groupId, event.replyToken, false);
      } else {
        await unbindGroupAndReply(senderUserId, groupId, event.replyToken);
      }
      return;
    }
    if (command === "group_id_echo") {
      await replyLineMessage(
        event.replyToken,
        [{ type: "text", text: `groupId: ${groupId}` }],
        { kind: "group_id_echo", recipient: groupId },
      );
    }
    return;
  }

  // Linking happens via OAuth in the app, not here. Only nudge if the message
  // looks like a link attempt — don't be chatty (or spend reply effort) on
  // every unrelated message.
  if (command === "link_hint") {
    await replyLineMessage(
      event.replyToken,
      [{ type: "text", text: LINK_HINT_TEXT }],
      { kind: "link_hint", recipient: userId },
    );
  }
}

async function replyText(
  replyToken: string,
  text: string,
  groupId: string,
): Promise<void> {
  await replyLineMessage(replyToken, [{ type: "text", text }], {
    kind: "group_bind",
    recipient: groupId,
  });
}

/**
 * Bind (or, when the shop already has another group and `confirmed` is false,
 * ask first via a postback bubble). Every successful change is also pushed 1:1
 * to the owner so a bind they were tricked into is visible outside the group.
 */
async function bindGroupAndReply(
  senderUserId: string,
  groupId: string,
  replyToken: string,
  confirmed: boolean,
): Promise<void> {
  const result = await bindShopLineGroupBySender(senderUserId, groupId, {
    confirmed,
  });
  if (!result.ok) {
    if (result.code === "needs_confirm") {
      await replyLineMessage(replyToken, [buildGroupBindConfirmFlex(result.shopName)], {
        kind: "group_bind_confirm",
        recipient: groupId,
      });
      return;
    }
    await replyText(replyToken, result.message, groupId);
    return;
  }
  if (result.unchanged) {
    await replyText(
      replyToken,
      `กลุ่มนี้เชื่อมกับร้าน “${result.shopName}” อยู่แล้ว`,
      groupId,
    );
    return;
  }
  await replyText(
    replyToken,
    `✅ เชื่อมต่อร้าน “${result.shopName}” กับกลุ่มนี้แล้ว — แจ้งเตือนการจองจะส่งเข้ากลุ่มนี้\n` +
      "พิมพ์ “ยกเลิกเชื่อมร้าน” ในกลุ่มนี้เมื่อต้องการหยุด",
    groupId,
  );
  await notifyOwnerGroupChange(
    senderUserId,
    `🔔 ร้าน “${result.shopName}” ` +
      (result.replacedGroup ? "ย้ายการแจ้งเตือนไปยังกลุ่ม LINE ใหม่แล้ว" : "เชื่อมกับกลุ่ม LINE แล้ว") +
      " — ข้อมูลการจอง (ชื่อลูกค้า บริการ เวลา) จะส่งเข้ากลุ่มนั้น " +
      "หากคุณไม่ได้ทำรายการนี้ ให้พิมพ์ “ยกเลิกเชื่อมร้าน” ในกลุ่มนั้น หรือนำ Quego ออกจากกลุ่ม",
  );
}

async function unbindGroupAndReply(
  senderUserId: string,
  groupId: string,
  replyToken: string,
): Promise<void> {
  const result = await unbindShopLineGroupBySender(senderUserId, groupId);
  if (!result.ok) {
    await replyText(replyToken, result.message, groupId);
    return;
  }
  if (!result.hadGroup) {
    await replyText(replyToken, "กลุ่มนี้ไม่ได้เชื่อมกับร้านของคุณ", groupId);
    return;
  }
  await replyText(
    replyToken,
    `ยกเลิกการเชื่อมร้าน “${result.shopName}” กับกลุ่มนี้แล้ว — แจ้งเตือนจะกลับไปส่งที่ LINE ส่วนตัวของเจ้าของร้าน`,
    groupId,
  );
  await notifyOwnerGroupChange(
    senderUserId,
    `🔕 ร้าน “${result.shopName}” ยกเลิกการเชื่อมกลุ่ม LINE แล้ว — แจ้งเตือนจะส่งมาที่แชทนี้แทน`,
  );
}
