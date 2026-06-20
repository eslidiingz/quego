"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/layout/PageHeader";
import { formatBaht } from "@/lib/baht";
import { getBangkokToday } from "@/lib/time/bangkok";
import {
  DEFAULT_EXPENSE_CATEGORIES,
  CUSTOM_EXPENSE_CATEGORY,
  MAX_EXPENSE_CATEGORY_LENGTH,
  iconForExpenseCategory,
} from "@/lib/expenses/categories";
import {
  parseExpenseFormData,
  validateExpenseForm,
  hasExpenseErrors,
  type ExpenseFormErrors,
} from "@/lib/validation/shop";
import type { ShopExpenseListItem } from "@/lib/services/expenses";
import {
  saveExpenseAction,
  deleteExpenseAction,
  type ExpenseFormState,
} from "./actions";

/**
 * Expense (ค่าใช้จ่าย) manager (shop owner). Renders the list and owns the
 * add/edit dialog + delete confirm. Data comes in as props (the server page
 * reads it); this component only handles UI state and calls the server actions.
 *
 * SRP: list layout + dialog orchestration. The form lives in `ExpenseFormModal`,
 * a row in `ExpenseRow`.
 */
export function ExpenseManager({
  expenses,
  usedCategories,
}: {
  expenses: ShopExpenseListItem[];
  usedCategories: string[];
}) {
  const [editing, setEditing] = useState<ShopExpenseListItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [toast, setToast] = useState<
    { kind: "success" | "error"; message: string } | null
  >(null);

  function openAdd() {
    setEditing(null);
    setDialogOpen(true);
  }
  function openEdit(expense: ShopExpenseListItem) {
    setEditing(expense);
    setDialogOpen(true);
  }
  function showToast(kind: "success" | "error", message: string) {
    setToast({ kind, message });
    window.setTimeout(() => setToast(null), 4000);
  }

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-stack-md">
      <PageHeader
        eyebrow="จัดการการเงิน"
        title="ค่าใช้จ่าย"
        description="บันทึกค่าใช้จ่ายของร้าน เช่น ค่าเช่า ค่าอุปกรณ์ ค่าพนักงาน เพื่อดูกำไรสุทธิในรายงานร้าน"
        action={
          <Button size="sm" iconLeft={<Icon name="add" size={18} />} onClick={openAdd}>
            เพิ่มค่าใช้จ่าย
          </Button>
        }
      />

      {toast ? (
        <div
          role="status"
          className={
            "rounded-lg border px-4 py-3 text-label-md flex items-center gap-2 " +
            (toast.kind === "success"
              ? "bg-primary-container/20 border-primary/30 text-primary"
              : "bg-error-container/40 border-error/30 text-error")
          }
        >
          <Icon name={toast.kind === "success" ? "check_circle" : "error"} />
          {toast.message}
        </div>
      ) : null}

      <section className="space-y-stack-md">
        {expenses.length === 0 ? (
          <EmptyState onAdd={openAdd} />
        ) : (
          <>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-3">
              <span className="text-label-md text-on-surface-variant">
                รวมทั้งหมด {expenses.length} รายการ
              </span>
              <span className="font-display text-headline-sm tabular-nums text-error">
                {formatBaht(total)}
              </span>
            </div>
            <ul className="space-y-3">
              {expenses.map((expense) => (
                <ExpenseRow
                  key={expense.id}
                  expense={expense}
                  onEdit={() => openEdit(expense)}
                />
              ))}
            </ul>
          </>
        )}
      </section>

      {dialogOpen ? (
        <ExpenseFormModal
          editing={editing}
          usedCategories={usedCategories}
          onClose={() => setDialogOpen(false)}
          onSaved={() =>
            showToast(
              "success",
              editing ? "แก้ไขค่าใช้จ่ายแล้ว" : "เพิ่มค่าใช้จ่ายแล้ว",
            )
          }
        />
      ) : null}
    </div>
  );
}

function ExpenseRow({
  expense,
  onEdit,
}: {
  expense: ShopExpenseListItem;
  onEdit: () => void;
}) {
  return (
    <li className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 md:p-5 flex items-start gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-error-container/30 text-error">
        <Icon name={iconForExpenseCategory(expense.category)} size={20} />
      </span>
      <div className="min-w-0 flex-1 space-y-1">
        <h3 className="font-display font-bold text-headline-sm text-on-surface leading-tight">
          {expense.category}
        </h3>
        <p className="text-label-md text-on-surface-variant">
          {formatThaiDate(expense.expenseDate)}
        </p>
        {expense.note ? (
          <p className="text-label-md text-on-surface-variant/70 line-clamp-2">
            {expense.note}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col items-end gap-2 shrink-0">
        <span className="font-display text-headline-sm tabular-nums text-error">
          {formatBaht(expense.amount)}
        </span>
        <div className="flex items-center">
          <button
            type="button"
            onClick={onEdit}
            aria-label="แก้ไขค่าใช้จ่าย"
            className="inline-flex items-center justify-center size-9 rounded-full text-on-surface-variant hover:bg-surface-container-high transition-colors"
          >
            <Icon name="edit" size={18} />
          </button>
          <ConfirmDialog
            trigger={
              <button
                type="button"
                aria-label="ลบค่าใช้จ่าย"
                className="inline-flex items-center justify-center size-9 rounded-full text-error hover:bg-error-container/40 transition-colors"
              >
                <Icon name="delete" size={18} />
              </button>
            }
            title="ลบรายการนี้?"
            description={`"${expense.category}" ${formatBaht(expense.amount)} จะถูกลบออกจากรายงาน`}
            confirmLabel="ลบ"
            cancelLabel="ยกเลิก"
            destructive
            onConfirm={() => deleteExpenseAction(expense.id)}
          />
        </div>
      </div>
    </li>
  );
}

function ExpenseFormModal({
  editing,
  usedCategories,
  onClose,
  onSaved,
}: {
  editing: ShopExpenseListItem | null;
  usedCategories: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [state, formAction, pending] = useActionState<ExpenseFormState, FormData>(
    saveExpenseAction,
    null,
  );
  const [errors, setErrors] = useState<ExpenseFormErrors>({});

  // Category options = preset labels ∪ previously-used categories (presets first).
  const knownCategories = useMemo(() => {
    const presets = DEFAULT_EXPENSE_CATEGORIES.map((c) => c.label);
    const extras = usedCategories.filter((c) => !presets.includes(c));
    return [...presets, ...extras];
  }, [usedCategories]);

  const editingIsKnown = editing
    ? knownCategories.includes(editing.category)
    : false;
  const [categorySel, setCategorySel] = useState<string>(
    editing
      ? editingIsKnown
        ? editing.category
        : CUSTOM_EXPENSE_CATEGORY
      : (knownCategories[0] ?? CUSTOM_EXPENSE_CATEGORY),
  );
  const [customCategory, setCustomCategory] = useState<string>(
    editing && !editingIsKnown ? editing.category : "",
  );

  const isCustom = categorySel === CUSTOM_EXPENSE_CATEGORY;
  const resolvedCategory = isCustom ? customCategory.trim() : categorySel;

  // Close on a successful save (the component mounts fresh per open).
  useEffect(() => {
    if (state?.ok) {
      onSaved();
      onClose();
    }
  }, [state, onSaved, onClose]);

  function clientAction(formData: FormData) {
    const fieldErrors = validateExpenseForm(parseExpenseFormData(formData));
    if (hasExpenseErrors(fieldErrors)) {
      setErrors(fieldErrors);
      return; // do not call the server on invalid input
    }
    setErrors({});
    formAction(formData);
  }

  const clearErr = (key: keyof ExpenseFormErrors) => () =>
    setErrors((e) => ({ ...e, [key]: undefined }));

  // Constrain amount at the source: digits + a single decimal point.
  function handleAmountInput(e: React.FormEvent<HTMLInputElement>) {
    const el = e.currentTarget;
    let v = el.value.replace(/[^0-9.]/g, "");
    const parts = v.split(".");
    if (parts.length > 2) v = `${parts[0]}.${parts.slice(1).join("")}`;
    el.value = v;
    clearErr("amount")();
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={editing ? "แก้ไขค่าใช้จ่าย" : "เพิ่มค่าใช้จ่าย"}
    >
      <form action={clientAction} noValidate className="space-y-5">
        {editing ? (
          <input type="hidden" name="expenseId" value={editing.id} />
        ) : null}
        {/* The resolved category is submitted via this hidden field; the
            select + custom input below are UI-only (not named, don't submit). */}
        <input type="hidden" name="category" value={resolvedCategory} />

        {state && !state.ok ? (
          <p className="rounded-lg bg-error-container/50 text-on-error-container text-label-md px-4 py-3">
            {state.message}
          </p>
        ) : null}

        <div className="space-y-2">
          <Select
            label="หมวดหมู่"
            required
            value={categorySel}
            onChange={(e) => {
              setCategorySel(e.target.value);
              clearErr("category")();
            }}
            errorText={isCustom ? undefined : errors.category}
          >
            {knownCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
            <option value={CUSTOM_EXPENSE_CATEGORY}>+ ระบุหมวดใหม่…</option>
          </Select>
          {isCustom ? (
            <Input
              aria-label="ชื่อหมวดหมู่ใหม่"
              placeholder="เช่น ค่าทำความสะอาด"
              value={customCategory}
              maxLength={MAX_EXPENSE_CATEGORY_LENGTH}
              onChange={(e) => {
                setCustomCategory(e.target.value);
                clearErr("category")();
              }}
              errorText={errors.category}
            />
          ) : null}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            name="amount"
            label="จำนวนเงิน (บาท)"
            required
            inputMode="decimal"
            defaultValue={editing ? String(editing.amount) : ""}
            placeholder="เช่น 1500"
            errorText={errors.amount}
            onChange={handleAmountInput}
          />
          <Input
            type="date"
            name="expenseDate"
            label="วันที่"
            required
            defaultValue={editing?.expenseDate ?? getBangkokToday()}
            errorText={errors.expenseDate}
            onChange={clearErr("expenseDate")}
          />
        </div>

        <Textarea
          name="note"
          label="หมายเหตุ"
          rows={2}
          defaultValue={editing?.note ?? ""}
          placeholder="รายละเอียดเพิ่มเติม (ไม่บังคับ)"
          errorText={errors.note}
          onChange={clearErr("note")}
        />

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={pending}
            fullWidth
            className="flex-1"
          >
            ยกเลิก
          </Button>
          <Button type="submit" disabled={pending} fullWidth className="flex-1">
            {pending ? "กำลังบันทึก…" : "บันทึก"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="bg-surface-container-lowest border border-dashed border-outline-variant rounded-xl p-12 text-center space-y-3">
      <div className="w-16 h-16 mx-auto rounded-full bg-error-container/30 text-error flex items-center justify-center">
        <Icon name="receipt_long" size={32} />
      </div>
      <h2 className="font-display text-headline-md text-on-surface">
        ยังไม่มีค่าใช้จ่าย
      </h2>
      <p className="text-body-md text-on-surface-variant max-w-md mx-auto">
        บันทึกค่าใช้จ่ายของร้าน เพื่อให้รายงานคำนวณกำไรสุทธิ (รายได้ − รายจ่าย) ให้คุณ
      </p>
      <Button onClick={onAdd} iconLeft={<Icon name="add" size={18} />}>
        เพิ่มค่าใช้จ่ายแรก
      </Button>
    </div>
  );
}

/** "2026-06-20" → "20 มิ.ย. 2026" — parsed at UTC to keep the calendar date intact. */
function formatThaiDate(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}
