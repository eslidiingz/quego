"use server";

import { revalidatePath } from "next/cache";
import { requireShopSession } from "@/lib/auth/shop-session-server";
import {
  createExpense,
  updateExpense,
  deleteExpense,
} from "@/lib/services/expenses";
import {
  parseExpenseFormData,
  validateExpenseForm,
  hasExpenseErrors,
} from "@/lib/validation/shop";

/**
 * Expense (ค่าใช้จ่าย) management actions. Thin `"use server"` adapters: parse
 * FormData, call the service with the session's shopId (never a form field),
 * then revalidate. The report reads expenses to compute net profit, so
 * `/shop/insights` is revalidated alongside the owner surface.
 */

function revalidateExpenseSurfaces() {
  revalidatePath("/shop/expenses");
  revalidatePath("/shop/insights");
}

export type ExpenseFormState =
  | { ok: true }
  | { ok: false; message: string }
  | null;

/**
 * Create (no `expenseId`) or update (with `expenseId`) an expense. The client
 * validates on submit before calling this; the validator here is the
 * server-side backstop.
 */
export async function saveExpenseAction(
  _prev: ExpenseFormState,
  formData: FormData,
): Promise<ExpenseFormState> {
  const session = await requireShopSession();

  const fields = parseExpenseFormData(formData);
  if (hasExpenseErrors(validateExpenseForm(fields))) {
    return { ok: false, message: "ข้อมูลค่าใช้จ่ายไม่ถูกต้อง" };
  }

  const input = {
    category: fields.category,
    amount: Number(fields.amount),
    expenseDate: fields.expenseDate,
    note: fields.note ?? null,
  };

  const expenseId = String(formData.get("expenseId") ?? "").trim();
  const result = expenseId
    ? await updateExpense(session.shopId, expenseId, input)
    : await createExpense(session.shopId, input);

  if (!result.ok) return { ok: false, message: result.message };

  revalidateExpenseSurfaces();
  return { ok: true };
}

/** Delete an expense. shopId from the verified session. */
export async function deleteExpenseAction(expenseId: string): Promise<void> {
  const session = await requireShopSession();
  const result = await deleteExpense(session.shopId, expenseId);
  if (!result.ok) throw new Error(result.message);
  revalidateExpenseSurfaces();
}
