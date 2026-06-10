import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  MAX_NOTE_LENGTH,
  isNoteWithinLimit,
  isValidCustomerPhone,
  normalizeNote,
} from "@/lib/customer/note-format";

/**
 * CRM-lite customer-notes service (OPP-14). A shop keeps ONE private free-text
 * note per customer phone (`UNIQUE(shop_id, customer_phone)`). Like every other
 * service here, all DB access goes through the service-role client (RLS
 * deny-all on `shop_customer_notes`), so the note's privacy is enforced in
 * application code: every query is scoped by `shopId`, which MUST come from the
 * caller's verified session — never request/form input.
 *
 * SRP: persistence for the per-shop customer note. The pure validation helpers
 * live in `@/lib/customer/note-format` (browser-safe, no `server-only`) so the
 * client `CustomerNoteForm` can share the length cap without importing this
 * service-role module; re-exported here for back-compat with existing callers.
 *
 * It never sets cookies, redirects, or throws for domain errors — the
 * page/form map the typed results into Thai-language UI.
 */

// ----- Pure validation helpers (re-exported from the browser-safe module) --

export { MAX_NOTE_LENGTH, isNoteWithinLimit, isValidCustomerPhone, normalizeNote };

// ----- Types --------------------------------------------------------------

export type CustomerNote = {
  note: string | null;
  updatedAt: string | null;
};

export type UpsertCustomerNoteResult =
  | { ok: true }
  | { ok: false; code: "invalid" | "unknown"; message: string };

const UNKNOWN_MESSAGE = "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง";
const INVALID_PHONE_MESSAGE = "เบอร์โทรไม่ถูกต้อง";
const TOO_LONG_MESSAGE = "บันทึกต้องไม่เกิน 2,000 ตัวอักษร";

// ----- Internal row shapes ------------------------------------------------

type NoteRow = {
  note: string;
  updated_at: string;
};

// ----- Read: one note -----------------------------------------------------

/**
 * Read this shop's private note for a customer phone. Returns
 * `{ note: null, updatedAt: null }` when there is none (or on infra error) so
 * the editor renders an empty box rather than failing the page.
 */
export async function getCustomerNote(
  shopId: string,
  phone: string,
): Promise<CustomerNote> {
  if (!isValidCustomerPhone(phone)) return { note: null, updatedAt: null };

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("shop_customer_notes")
    .select("note, updated_at")
    .eq("shop_id", shopId)
    .eq("customer_phone", phone)
    .maybeSingle<NoteRow>();

  if (error) {
    console.error("getCustomerNote error:", error);
    return { note: null, updatedAt: null };
  }
  if (!data) return { note: null, updatedAt: null };
  return { note: data.note, updatedAt: data.updated_at };
}

// ----- Write: upsert / clear ----------------------------------------------

/**
 * Save (or clear) this shop's private note for a customer phone. `shopId` MUST
 * come from the verified session — it is the ownership key, so a shop can only
 * touch its own note rows.
 *
 *   - empty/whitespace note → DELETE the row (note cleared) and return ok
 *   - otherwise UPSERT on (shop_id, customer_phone), bumping updated_at
 *
 * Length is capped at 2,000 (matching the DB CHECK); the phone must be 9–10
 * digits. Real DB errors are logged server-side and surfaced as a generic Thai
 * message so we never leak schema/constraint names.
 */
export async function upsertCustomerNote(
  shopId: string,
  phone: string,
  rawNote: string,
): Promise<UpsertCustomerNoteResult> {
  if (!isValidCustomerPhone(phone)) {
    return { ok: false, code: "invalid", message: INVALID_PHONE_MESSAGE };
  }

  const note = normalizeNote(rawNote);
  if (!isNoteWithinLimit(note)) {
    return { ok: false, code: "invalid", message: TOO_LONG_MESSAGE };
  }

  const supabase = getSupabaseAdmin();

  // Empty note ⇒ clear it. A delete with no matching row is a no-op, which is
  // exactly the desired "note is now empty" outcome either way.
  if (note === null) {
    const { error } = await supabase
      .from("shop_customer_notes")
      .delete()
      .eq("shop_id", shopId)
      .eq("customer_phone", phone);
    if (error) {
      console.error("upsertCustomerNote delete error:", error);
      return { ok: false, code: "unknown", message: UNKNOWN_MESSAGE };
    }
    return { ok: true };
  }

  const { error } = await supabase
    .from("shop_customer_notes")
    .upsert(
      {
        shop_id: shopId,
        customer_phone: phone,
        note,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "shop_id,customer_phone" },
    );

  if (error) {
    console.error("upsertCustomerNote upsert error:", error);
    return { ok: false, code: "unknown", message: UNKNOWN_MESSAGE };
  }
  return { ok: true };
}
