import "server-only";

/**
 * LINE Messaging API channel configuration. SRP: turn env vars into typed
 * values, failing loud when a required secret is missing — the same posture as
 * getSupabaseAdmin() and the session-secret reader. The two secrets carry no
 * NEXT_PUBLIC_ prefix so they never enter the browser bundle.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name} in environment.`);
  }
  return value;
}

/** Channel secret — verifies the x-line-signature HMAC on inbound webhooks. */
export function getLineChannelSecret(): string {
  return required("LINE_CHANNEL_SECRET");
}

/** Long-lived channel access token — authorizes outbound push/reply calls. */
export function getLineChannelAccessToken(): string {
  return required("LINE_CHANNEL_ACCESS_TOKEN");
}

/**
 * OA basic id (e.g. "@quego"), used to build the "เชื่อม LINE" deep link. This
 * value IS public — it appears in a user-facing link — hence the NEXT_PUBLIC_
 * name. Resolved server-side and passed to the client as a finished URL.
 */
export function getLineOaBasicId(): string {
  return required("NEXT_PUBLIC_LINE_OA_BASIC_ID");
}

/**
 * LINE Login channel id (client_id) — identifies the shop-connect OAuth flow on
 * the authorize endpoint. This is a SEPARATE channel from the Messaging API one
 * above; it must sit under the same LINE provider and be linked to the Messaging
 * channel so the userId it returns is push-addressable. Server-only.
 */
export function getLineLoginChannelId(): string {
  return required("LINE_LOGIN_CHANNEL_ID");
}

/** LINE Login channel secret — authorizes the OAuth token exchange. Server-only. */
export function getLineLoginChannelSecret(): string {
  return required("LINE_LOGIN_CHANNEL_SECRET");
}
