/**
 * Expense categories (หมวดหมู่ค่าใช้จ่าย) for the shop expense tracker.
 *
 * Pure + browser-safe (no `server-only`) so the form, the validator, and the
 * report can share one source of truth. A category is stored on each expense as
 * free TEXT (the label), so a shop can also type its own — these presets are the
 * suggested defaults shown first in the picker.
 */

export type ExpenseCategoryPreset = {
  /** Stored verbatim as the expense's `category` text + shown to the owner. */
  label: string;
  /** Material Symbols icon name for the picker / list. */
  icon: string;
};

export const DEFAULT_EXPENSE_CATEGORIES: ExpenseCategoryPreset[] = [
  { label: "ค่าเช่าร้าน", icon: "home_work" },
  { label: "ค่าอุปกรณ์/วัสดุ", icon: "inventory_2" },
  { label: "ค่าพนักงาน", icon: "groups" },
  { label: "ค่าน้ำ/ค่าไฟ", icon: "bolt" },
  { label: "การตลาด/โฆษณา", icon: "campaign" },
  { label: "ค่าซ่อมบำรุง", icon: "build" },
  { label: "อื่นๆ", icon: "more_horiz" },
];

/** Max length of a category label — matches the DB CHECK on shop_expenses.category. */
export const MAX_EXPENSE_CATEGORY_LENGTH = 80;

/** Sentinel `<select>` value that reveals the "type your own category" input. */
export const CUSTOM_EXPENSE_CATEGORY = "__custom__";

/** Icon for a category label — the preset icon if known, else a generic fallback. */
export function iconForExpenseCategory(label: string): string {
  return (
    DEFAULT_EXPENSE_CATEGORIES.find((c) => c.label === label)?.icon ??
    "receipt_long"
  );
}
