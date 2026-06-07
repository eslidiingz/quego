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
 * OA basic id (e.g. "@queva"), used to build the "เชื่อม LINE" deep link. This
 * value IS public — it appears in a user-facing link — hence the NEXT_PUBLIC_
 * name. Resolved server-side and passed to the client as a finished URL.
 */
export function getLineOaBasicId(): string {
  return required("NEXT_PUBLIC_LINE_OA_BASIC_ID");
}
