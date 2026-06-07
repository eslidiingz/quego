import "server-only";
import { getLineChannelAccessToken } from "./config";
import { recordLineMessage } from "@/lib/services/line-log";

/**
 * Outbound LINE Messaging client. SRP: speak the LINE send HTTP — push & reply —
 * and nothing about customers or bookings. Fail-silent by contract: it NEVER
 * throws to the caller (LINE bills per recipient and silently drops over-quota,
 * per OPP-02). It returns a typed result and records every outcome to
 * line_message_log so drops stay observable. Prefer reply (free) over push
 * (metered) wherever a replyToken is available.
 */

const LINE_MESSAGE_API = "https://api.line.me/v2/bot/message";

export type LineTextMessage = { type: "text"; text: string };
export type LineFlexMessage = {
  type: "flex";
  altText: string;
  contents: unknown;
};
export type LineMessage = LineTextMessage | LineFlexMessage;

export type LineErrorCode =
  | "over_quota"
  | "invalid_token"
  | "bad_request"
  | "network"
  | "unknown";

export type LineSendResult =
  | { ok: true }
  | { ok: false; code: LineErrorCode; message: string };

const ERROR_MESSAGES: Record<LineErrorCode, string> = {
  over_quota: "ส่งข้อความ LINE ไม่สำเร็จ: เกินโควต้าการส่ง",
  invalid_token: "ส่งข้อความ LINE ไม่สำเร็จ: การตั้งค่า channel ไม่ถูกต้อง",
  bad_request: "ส่งข้อความ LINE ไม่สำเร็จ: รูปแบบข้อความไม่ถูกต้อง",
  network: "ส่งข้อความ LINE ไม่สำเร็จ: เชื่อมต่อ LINE ไม่ได้",
  unknown: "ส่งข้อความ LINE ไม่สำเร็จ",
};

/**
 * Map a LINE API HTTP status to our error taxonomy. Pure + exported so the
 * mapping is unit-testable without a live channel. 429 is surfaced distinctly as
 * over_quota — the metered-drop case the product cares about.
 */
export function classifyLineErrorStatus(status: number): LineErrorCode {
  if (status === 429) return "over_quota";
  if (status === 401 || status === 403) return "invalid_token";
  if (status === 400) return "bad_request";
  return "unknown";
}

type LineSendOpts = { kind?: string; recipient?: string };

async function send(
  endpoint: "push" | "reply",
  payload: Record<string, unknown>,
  recipient: string,
  kind: string,
): Promise<LineSendResult> {
  let token: string;
  try {
    token = getLineChannelAccessToken();
  } catch (err) {
    console.error("LINE access token unavailable:", err);
    await recordLineMessage({
      recipient,
      direction: "outbound",
      kind,
      status: "failed",
      meta: { reason: "missing_token" },
    });
    return {
      ok: false,
      code: "invalid_token",
      message: ERROR_MESSAGES.invalid_token,
    };
  }

  let response: Response;
  try {
    response = await fetch(`${LINE_MESSAGE_API}/${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error(`LINE ${endpoint} network error:`, err);
    await recordLineMessage({
      recipient,
      direction: "outbound",
      kind,
      status: "failed",
      meta: { reason: "network" },
    });
    return { ok: false, code: "network", message: ERROR_MESSAGES.network };
  }

  if (!response.ok) {
    const code = classifyLineErrorStatus(response.status);
    const bodyText = await response.text().catch(() => "");
    console.error(`LINE ${endpoint} failed (${response.status}):`, bodyText);
    await recordLineMessage({
      recipient,
      direction: "outbound",
      kind,
      status: code === "over_quota" ? "over_quota" : "failed",
      meta: { status: response.status, body: bodyText.slice(0, 500) },
    });
    return { ok: false, code, message: ERROR_MESSAGES[code] };
  }

  await recordLineMessage({
    recipient,
    direction: "outbound",
    kind,
    status: "sent",
  });
  return { ok: true };
}

/** Push messages to a userId (metered — bills per recipient). */
export async function pushLineMessage(
  userId: string,
  messages: LineMessage[],
  opts: LineSendOpts = {},
): Promise<LineSendResult> {
  return send("push", { to: userId, messages }, userId, opts.kind ?? "push");
}

/** Reply within a webhook's reply window (free). */
export async function replyLineMessage(
  replyToken: string,
  messages: LineMessage[],
  opts: LineSendOpts = {},
): Promise<LineSendResult> {
  return send(
    "reply",
    { replyToken, messages },
    opts.recipient ?? "reply",
    opts.kind ?? "reply",
  );
}
