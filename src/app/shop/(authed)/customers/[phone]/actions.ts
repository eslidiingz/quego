"use server";

import { revalidatePath } from "next/cache";
import { requireShopSession } from "@/lib/auth/shop-session-server";
import { upsertCustomerNote } from "@/lib/services/customer-notes";

export type SaveCustomerNoteState =
  | { ok: true }
  | { ok: false; message: string }
  | null;

/**
 * Save (or clear) the shop's private note for a customer. Thin adapter:
 *
 *   - shopId comes from the VERIFIED session — never the form, so a shop can
 *     only write its own note rows (ownership).
 *   - the phone is read from the form (it identifies which customer's note),
 *     but the service re-validates its shape and the note length.
 *
 * On success the customer page is revalidated so the editor + "last updated"
 * reflect the new value.
 */
export async function saveCustomerNoteAction(
  _prev: SaveCustomerNoteState,
  formData: FormData,
): Promise<SaveCustomerNoteState> {
  const session = await requireShopSession();
  const phone = String(formData.get("phone") ?? "").trim();
  const note = String(formData.get("note") ?? "");

  const result = await upsertCustomerNote(session.shopId, phone, note);
  if (!result.ok) {
    return { ok: false, message: result.message };
  }

  revalidatePath(`/shop/customers/${phone}`, "page");
  return { ok: true };
}
