import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * Audit/metering writes for LINE traffic. SRP: own inserts into
 * line_message_log — nothing else. Best-effort: a logging failure must never
 * break a send or a webhook. The table exists precisely so fail-silent sends
 * stay observable; if logging itself fails we console.error and move on.
 */

export type LineLogDirection = "outbound" | "inbound";
export type LineLogStatus =
  | "sent"
  | "dropped"
  | "over_quota"
  | "failed"
  | "received";

export type RecordLineMessageInput = {
  /** LINE userId for pushes/inbound; a stable label (e.g. "reply") otherwise. */
  recipient: string;
  direction: LineLogDirection;
  /** Purpose tag: 'link_confirm', 'welcome', 'inbound', … */
  kind: string;
  status: LineLogStatus;
  /** LINE message/webhook id when known — the dedupe key for retried deliveries. */
  lineMessageId?: string | null;
  meta?: Record<string, unknown> | null;
};

export async function recordLineMessage(
  input: RecordLineMessageInput,
): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("line_message_log").insert({
      recipient: input.recipient,
      direction: input.direction,
      kind: input.kind,
      status: input.status,
      line_message_id: input.lineMessageId ?? null,
      meta: input.meta ?? null,
    });
    // 23505 = a redelivered webhook we've already logged by line_message_id.
    // That's expected dedupe, not an error — stay quiet on it.
    if (error && error.code !== "23505") {
      console.error("recordLineMessage insert error:", error);
    }
  } catch (err) {
    console.error("recordLineMessage unexpected error:", err);
  }
}
