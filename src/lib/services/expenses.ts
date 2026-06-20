import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * Shop-expenses (ค่าใช้จ่ายของร้าน) service. A shop records one-off expenses —
 * each with a free-text category, a baht amount, a date, and an optional note —
 * which the report (รายงานร้าน) aggregates into net profit.
 *
 * SRP: CRUD + the reads the manager UI needs. All access goes through the
 * service-role client (RLS deny-all on `shop_expenses`), so every authorization
 * decision is made here. Ownership is enforced with a compound
 * `.eq("shop_id", shopId)` filter on every mutation — `shopId` MUST come from
 * the caller's verified session, never from request input, so a shop can only
 * touch its own rows even by guessing a UUID.
 */

// ----- Types --------------------------------------------------------------

export type ShopExpenseListItem = {
  id: string;
  category: string;
  amount: number;
  /** "YYYY-MM-DD". */
  expenseDate: string;
  note: string | null;
};

export type ShopExpenseInput = {
  category: string;
  amount: number;
  expenseDate: string;
  note?: string | null;
};

export type ExpenseMutationResult =
  | { ok: true; id: string }
  | {
      ok: false;
      code: "invalid" | "not_found" | "unknown";
      message: string;
    };

type ExpenseRow = {
  id: string;
  category: string;
  amount: number | string;
  expense_date: string;
  note: string | null;
};

/** Postgres `numeric` arrives over the wire as a string — coerce to number. */
function toAmount(value: number | string | null): number | null {
  if (value == null) return null;
  const n = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(n) ? n : null;
}

function mapRow(r: ExpenseRow): ShopExpenseListItem {
  return {
    id: r.id,
    category: r.category,
    amount: toAmount(r.amount) ?? 0,
    expenseDate: r.expense_date,
    note: r.note,
  };
}

// ----- Read ---------------------------------------------------------------

/** All expenses for one shop, newest first — for the management list. */
export async function listExpensesByShop(
  shopId: string,
): Promise<ShopExpenseListItem[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("shop_expenses")
    .select("id, category, amount, expense_date, note")
    .eq("shop_id", shopId)
    .order("expense_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return (data as ExpenseRow[]).map(mapRow);
}

/**
 * Distinct category strings the shop has already used, most-recent first. Feeds
 * the expense form's category dropdown so custom categories the owner typed
 * before are reusable alongside the preset defaults.
 */
export async function listUsedExpenseCategories(
  shopId: string,
): Promise<string[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("shop_expenses")
    .select("category")
    .eq("shop_id", shopId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of data as { category: string }[]) {
    const c = r.category.trim();
    if (c && !seen.has(c)) {
      seen.add(c);
      out.push(c);
    }
  }
  return out;
}

// ----- Write --------------------------------------------------------------

type NormalizedExpense = {
  category: string;
  amount: number;
  expenseDate: string;
  note: string | null;
};

/**
 * Server-side backstop normalization. Mirrors the action-layer validator but
 * never trusts it — category 1–80 chars, amount a positive number rounded to
 * cents (numeric(10,2) column), date a "YYYY-MM-DD" shape, note ≤ 500 chars.
 */
function normalize(input: ShopExpenseInput): NormalizedExpense | null {
  const category = input.category.trim();
  if (category.length === 0 || category.length > 80) return null;

  if (!Number.isFinite(input.amount) || input.amount <= 0) return null;
  const amount = Math.round(input.amount * 100) / 100;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.expenseDate)) return null;

  const note = input.note?.trim() || null;
  if (note && note.length > 500) return null;

  return { category, amount, expenseDate: input.expenseDate, note };
}

/** Add an expense. Format validation also runs in the action layer; this is the backstop. */
export async function createExpense(
  shopId: string,
  input: ShopExpenseInput,
): Promise<ExpenseMutationResult> {
  const fields = normalize(input);
  if (!fields) {
    return { ok: false, code: "invalid", message: "ข้อมูลค่าใช้จ่ายไม่ถูกต้อง" };
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("shop_expenses")
    .insert({
      shop_id: shopId,
      category: fields.category,
      amount: fields.amount,
      expense_date: fields.expenseDate,
      note: fields.note,
    })
    .select("id")
    .single();

  if (error) return { ok: false, code: "unknown", message: error.message };
  return { ok: true, id: data.id as string };
}

/**
 * Update an expense. Ownership enforced by the compound `id + shop_id` filter —
 * a mismatch returns zero rows → `not_found`.
 */
export async function updateExpense(
  shopId: string,
  expenseId: string,
  input: ShopExpenseInput,
): Promise<ExpenseMutationResult> {
  const fields = normalize(input);
  if (!fields) {
    return { ok: false, code: "invalid", message: "ข้อมูลค่าใช้จ่ายไม่ถูกต้อง" };
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("shop_expenses")
    .update({
      category: fields.category,
      amount: fields.amount,
      expense_date: fields.expenseDate,
      note: fields.note,
      updated_at: new Date().toISOString(),
    })
    .eq("id", expenseId)
    .eq("shop_id", shopId)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, code: "unknown", message: error.message };
  if (!data)
    return { ok: false, code: "not_found", message: "ไม่พบรายการค่าใช้จ่ายนี้" };
  return { ok: true, id: data.id as string };
}

/** Delete an expense. Compound `id + shop_id` filter enforces ownership. */
export async function deleteExpense(
  shopId: string,
  expenseId: string,
): Promise<ExpenseMutationResult> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("shop_expenses")
    .delete()
    .eq("id", expenseId)
    .eq("shop_id", shopId)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, code: "unknown", message: error.message };
  if (!data)
    return { ok: false, code: "not_found", message: "ไม่พบรายการค่าใช้จ่ายนี้" };
  return { ok: true, id: data.id as string };
}
