import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

/**
 * Customer (end-user) service. Mirrors the shape of `shops.ts`'s PIN flow
 * but without the approval gate — customers are created lazily on first
 * successful PIN setup, no admin moderation in the loop.
 *
 * Linkage between a customer row and their historical bookings is by
 * phone number, NOT by a foreign key. This keeps anonymous bookings (no
 * customer account) and authenticated bookings consistent under one
 * `bookings.customer_phone` column.
 */

// ----- Types --------------------------------------------------------------

export type CustomerLoginInfo = {
  id: string;
  phone: string;
  /** True when the customer has already set a PIN (returning login). */
  hasPin: boolean;
};

export type PinResult =
  | { ok: true; customerId: string }
  | {
      ok: false;
      code: "not_found" | "bad_pin" | "pin_already_set" | "duplicate" | "unknown";
      message: string;
    };

const PIN_LENGTH = 6;
const PIN_RE = /^\d{6}$/u;

// ----- Read ---------------------------------------------------------------

/**
 * Look up a customer by phone. Returns null if no row exists — distinct
 * from `findApprovedShopByPhone`, which also returns null for the "exists
 * but not approved" case (no analogous moderation gate for customers).
 */
export async function findCustomerByPhone(
  phone: string,
): Promise<CustomerLoginInfo | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("customers")
    .select("id, phone, pin_hash")
    .eq("phone", phone)
    .maybeSingle();

  if (error || !data) return null;
  return {
    id: data.id as string,
    phone: data.phone as string,
    hasPin: Boolean(data.pin_hash),
  };
}

// ----- Write --------------------------------------------------------------

/**
 * Setup the first PIN for a phone. If no row exists, creates one with the
 * hashed PIN; if a row exists without a PIN, sets it. If a PIN is already
 * set, fails with `pin_already_set` so the caller falls back to verify.
 */
export async function createOrSetCustomerPin(
  phone: string,
  pin: string,
): Promise<PinResult> {
  if (!PIN_RE.test(pin)) {
    return {
      ok: false,
      code: "bad_pin",
      message: `รหัส PIN ต้องเป็นตัวเลข ${PIN_LENGTH} หลัก`,
    };
  }

  const supabase = getSupabaseAdmin();
  const existing = await findCustomerByPhone(phone);

  if (existing?.hasPin) {
    return {
      ok: false,
      code: "pin_already_set",
      message: "ตั้ง PIN ของบัญชีนี้ไปแล้ว",
    };
  }

  const pinHash = await hashPassword(pin);

  if (existing) {
    const { error } = await supabase
      .from("customers")
      .update({ pin_hash: pinHash })
      .eq("id", existing.id);
    if (error) return { ok: false, code: "unknown", message: error.message };
    return { ok: true, customerId: existing.id };
  }

  const { data, error } = await supabase
    .from("customers")
    .insert({ phone, pin_hash: pinHash })
    .select("id")
    .single();

  if (error) {
    // 23505 = unique_violation. Race: someone else just registered the
    // same phone between our existence check and this insert. Re-look up
    // and bail to verify mode.
    if (error.code === "23505") {
      return {
        ok: false,
        code: "duplicate",
        message: "เบอร์โทรนี้มีบัญชีอยู่แล้ว กรุณาเข้าสู่ระบบด้วย PIN",
      };
    }
    return { ok: false, code: "unknown", message: error.message };
  }

  return { ok: true, customerId: data!.id as string };
}

/**
 * Verify the PIN for an existing customer. Returns the customerId on
 * success so the caller can mint a session without an extra round-trip.
 */
export async function verifyCustomerPin(
  phone: string,
  pin: string,
): Promise<PinResult> {
  if (!PIN_RE.test(pin)) {
    return { ok: false, code: "bad_pin", message: "รหัส PIN ไม่ถูกต้อง" };
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("customers")
    .select("id, pin_hash")
    .eq("phone", phone)
    .maybeSingle();

  if (error) return { ok: false, code: "unknown", message: error.message };
  if (!data || !data.pin_hash) {
    return { ok: false, code: "not_found", message: "ไม่พบบัญชีนี้" };
  }

  const ok = await verifyPassword(pin, data.pin_hash as string);
  if (!ok) {
    return { ok: false, code: "bad_pin", message: "รหัส PIN ไม่ถูกต้อง" };
  }

  return { ok: true, customerId: data.id as string };
}

// ----- Profile (self-service) ---------------------------------------------

export type CustomerProfile = {
  id: string;
  phone: string;
  /** Display name; null until the customer fills it in. */
  name: string | null;
};

/**
 * Fetch one customer's editable profile by id (from the verified session).
 * Phone is included read-only — it's the identity key and isn't editable here.
 */
export async function getCustomerProfile(
  id: string,
): Promise<CustomerProfile | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("customers")
    .select("id, phone, name")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return {
    id: data.id as string,
    phone: data.phone as string,
    name: (data.name as string | null) ?? null,
  };
}

export type UpdateCustomerNameResult =
  | { ok: true }
  | { ok: false; code: "invalid" | "not_found" | "unknown"; message: string };

/**
 * Update the customer's display name. An empty value clears it (stored NULL).
 * Mirrors the DB CHECK (1–100 chars when present). Phone is never touched —
 * changing the identity key is deliberately out of scope.
 */
export async function updateCustomerName(
  id: string,
  name: string,
): Promise<UpdateCustomerNameResult> {
  const trimmed = name.trim();
  if (trimmed.length > 100) {
    return {
      ok: false,
      code: "invalid",
      message: "ชื่อต้องยาวไม่เกิน 100 ตัวอักษร",
    };
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("customers")
    .update({ name: trimmed.length > 0 ? trimmed : null })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, code: "unknown", message: error.message };
  if (!data) return { ok: false, code: "not_found", message: "ไม่พบบัญชีนี้" };
  return { ok: true };
}

export type ChangePinResult =
  | { ok: true }
  | {
      ok: false;
      code: "bad_current" | "bad_new" | "not_found" | "unknown";
      message: string;
    };

/**
 * Change an existing customer's PIN: verify the current PIN against the stored
 * hash, then replace it with a hash of the new one. The `id` MUST come from the
 * verified session so a customer can only ever change their own PIN.
 */
export async function changeCustomerPin(
  id: string,
  currentPin: string,
  newPin: string,
): Promise<ChangePinResult> {
  if (!PIN_RE.test(newPin)) {
    return {
      ok: false,
      code: "bad_new",
      message: `รหัส PIN ต้องเป็นตัวเลข ${PIN_LENGTH} หลัก`,
    };
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("customers")
    .select("pin_hash")
    .eq("id", id)
    .maybeSingle();

  if (error) return { ok: false, code: "unknown", message: error.message };
  if (!data || !data.pin_hash) {
    return { ok: false, code: "not_found", message: "ไม่พบบัญชีนี้" };
  }

  const ok = await verifyPassword(currentPin, data.pin_hash as string);
  if (!ok) {
    return { ok: false, code: "bad_current", message: "รหัส PIN เดิมไม่ถูกต้อง" };
  }

  const hash = await hashPassword(newPin);
  const { error: updateError } = await supabase
    .from("customers")
    .update({ pin_hash: hash })
    .eq("id", id);

  if (updateError) {
    return { ok: false, code: "unknown", message: updateError.message };
  }
  return { ok: true };
}
