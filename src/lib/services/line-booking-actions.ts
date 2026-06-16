import "server-only";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { replyLineMessage } from "@/lib/line/client";
import { buildCancelConfirmFlex } from "@/lib/line/booking-flex";
import { findCustomerByLineUserId } from "@/lib/services/line-linking";
import {
  acknowledgeCustomerArrival,
  cancelOwnBooking,
} from "@/lib/services/bookings";

/**
 * OPP-03 — LINE flex-button postback actions (กำลังมา / ขอเลื่อน / ยกเลิก).
 *
 * SRP: parse the postback contract, resolve the LINE user → customer, RE-VERIFY
 * ownership through the service layer, then act + craft the free reply. Security:
 * the bookingId in a postback is attacker-controllable, so it is NEVER trusted
 * on its own — every mutation is keyed by the phone resolved from the verified
 * LINE userId (`acknowledgeCustomerArrival` / `cancelOwnBooking` both filter on
 * `customer_phone`), so a probed/forged bookingId simply matches no row.
 *
 * "ขอเลื่อน" is NOT handled here — it is a URI button that opens the web
 * reschedule page (slot picking needs the picker), so only the in-chat actions
 * land as postbacks.
 */

export type ParsedBookingPostback =
  | { act: "coming" | "cancel" | "cancelyes"; bookingId: string }
  | { act: "keep" };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

/**
 * Parse the `act=<action>&b=<bookingId>` postback contract. Returns null for
 * anything we don't model (including a malformed bookingId) so the webhook can
 * safely ignore it.
 */
export function parseBookingPostback(
  data: string,
): ParsedBookingPostback | null {
  const params = new URLSearchParams(data);
  const act = params.get("act");
  if (act === "keep") return { act: "keep" };
  const bookingId = params.get("b") ?? "";
  if (!UUID_RE.test(bookingId)) return null;
  if (act === "coming" || act === "cancel" || act === "cancelyes") {
    return { act, bookingId };
  }
  return null;
}

const NOT_LINKED_TEXT =
  "ยังไม่พบบัญชี quego ที่เชื่อมกับ LINE นี้ — เปิดแอป quego ไปที่ " +
  "โปรไฟล์ › การแจ้งเตือน แล้วกด “เชื่อมต่อ LINE”";

async function replyText(
  replyToken: string,
  text: string,
  kind: string,
): Promise<void> {
  await replyLineMessage(replyToken, [{ type: "text", text }], { kind });
}

/**
 * Dispatch a parsed booking postback to its action + reply. Fail-silent: any
 * unexpected error is logged, never thrown (the webhook always returns 200).
 */
export async function handleBookingPostback(
  parsed: ParsedBookingPostback,
  lineUserId: string,
  replyToken: string,
): Promise<void> {
  try {
    // Per-LINE-user throttle: the postback path has no IP/session, so key on the
    // (verified) LINE userId so a compromised/abusive account can't spam queue
    // mutations against shops. The web cancel/reschedule paths are rate-limited
    // separately by IP.
    if (!(await checkRateLimit(`line-postback:${lineUserId}`, 15, 600))) {
      await replyText(
        replyToken,
        "ทำรายการบ่อยเกินไป กรุณาลองใหม่ในภายหลัง",
        "postback_rate_limited",
      );
      return;
    }
    if (parsed.act === "keep") {
      await replyText(replyToken, "เก็บคิวไว้ให้แล้วค่ะ ✨", "postback_keep");
      return;
    }

    const customer = await findCustomerByLineUserId(lineUserId);
    if (!customer) {
      await replyText(replyToken, NOT_LINKED_TEXT, "postback_unlinked");
      return;
    }

    switch (parsed.act) {
      case "coming": {
        const res = await acknowledgeCustomerArrival(
          parsed.bookingId,
          customer.phone,
        );
        await replyText(
          replyToken,
          !res.ok
            ? res.message
            : res.firstAck
              ? "รับทราบค่ะ 🙌 ทางร้านทราบแล้วว่าคุณกำลังมา"
              : "คุณได้แจ้งว่ากำลังมาแล้วก่อนหน้านี้ค่ะ 🙏",
          "postback_coming",
        );
        return;
      }
      case "cancel": {
        // Step 1 of 2: ask to confirm. The actual cancel (cancelyes) re-checks
        // ownership + cutoff, so showing this bubble leaks nothing.
        await replyLineMessage(
          replyToken,
          [buildCancelConfirmFlex(parsed.bookingId)],
          { kind: "postback_cancel_confirm" },
        );
        return;
      }
      case "cancelyes": {
        const res = await cancelOwnBooking(parsed.bookingId, customer.phone);
        await replyText(
          replyToken,
          res.ok
            ? "ยกเลิกคิวเรียบร้อยแล้ว 🙏 ทางร้านได้รับแจ้งแล้ว"
            : res.message,
          "postback_cancel",
        );
        return;
      }
    }
  } catch (err) {
    console.error("handleBookingPostback error:", err);
  }
}
