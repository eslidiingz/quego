"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Chip } from "@/components/ui/Chip";
import { Switch } from "@/components/ui/Switch";
import {
  CategoryFormDialog,
  type CategoryEditing,
} from "./CategoryFormDialog";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { setCategoryActiveAction } from "./actions";

export type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  updated_at: string;
};

type Toast = { kind: "success" | "error"; message: string } | null;

/**
 * Category list + CRUD orchestration. Owns only UI state: the add/edit dialog,
 * the delete confirm, the active toggle, and a toast. A single card lives in
 * `CategoryCard`; the form in `CategoryFormDialog`. Mobile-first card layout
 * (mirrors the presets manager) so the list reflows on phones instead of
 * scrolling a wide table sideways.
 */
export function CategoriesTable({ rows }: { rows: CategoryRow[] }) {
  const [editing, setEditing] = useState<CategoryEditing>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [toast, setToast] = useState<Toast>(null);

  const showToast = (kind: NonNullable<Toast>["kind"], message: string) => {
    setToast({ kind, message });
    window.setTimeout(() => setToast(null), 4000);
  };

  return (
    <div className="space-y-6">
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

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-on-surface-variant text-body-md">
          {rows.length === 0
            ? "ยังไม่มีหมวดหมู่ในระบบ — เริ่มต้นด้วยการเพิ่มอันแรก"
            : `ทั้งหมด ${rows.length} หมวดหมู่`}
        </p>
        <Button
          onClick={() => setCreateOpen(true)}
          rounded="full"
          iconLeft={<Icon name="add" />}
          fullWidth
          className="sm:w-auto"
        >
          เพิ่มหมวดหมู่
        </Button>
      </div>

      {rows.length === 0 ? (
        <EmptyState onAdd={() => setCreateOpen(true)} />
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <CategoryCard
              key={row.id}
              row={row}
              onEdit={() => setEditing(row)}
              onDelete={() => setDeleteTarget({ id: row.id, name: row.name })}
              onToggleError={(msg) => showToast("error", msg)}
            />
          ))}
        </ul>
      )}

      <CategoryFormDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        editing={null}
        onSuccess={(msg) => showToast("success", msg)}
      />
      <CategoryFormDialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        editing={editing}
        onSuccess={(msg) => showToast("success", msg)}
      />
      {deleteTarget ? (
        <DeleteConfirmDialog
          open={deleteTarget !== null}
          onClose={() => setDeleteTarget(null)}
          categoryId={deleteTarget.id}
          categoryName={deleteTarget.name}
          onResult={(ok, msg) => showToast(ok ? "success" : "error", msg)}
        />
      ) : null}
    </div>
  );
}

function CategoryCard({
  row,
  onEdit,
  onDelete,
  onToggleError,
}: {
  row: CategoryRow;
  onEdit: () => void;
  onDelete: () => void;
  onToggleError: (message: string) => void;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <li
      className={
        "bg-surface-container-lowest border border-outline-variant rounded-xl p-4 md:p-5 flex items-start gap-3 transition-colors " +
        (row.is_active ? "" : "opacity-70")
      }
    >
      {row.icon ? (
        <span className="size-11 shrink-0 rounded-xl bg-primary-container/10 text-primary flex items-center justify-center">
          <Icon name={row.icon} />
        </span>
      ) : null}

      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="text-label-sm font-bold text-on-surface-variant tabular-nums shrink-0">
            #{row.sort_order}
          </span>
          <h3 className="font-display font-bold text-headline-sm text-on-surface leading-tight truncate">
            {row.name}
          </h3>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <code className="text-label-sm text-on-surface-variant bg-surface-container px-2 py-1 rounded">
            {row.slug}
          </code>
          {!row.is_active ? (
            <Chip variant="neutral" size="sm">
              ปิดอยู่
            </Chip>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col items-end gap-2 shrink-0">
        <Switch
          checked={row.is_active}
          disabled={pending}
          aria-label={row.is_active ? "ปิดการใช้งานหมวดหมู่" : "เปิดการใช้งานหมวดหมู่"}
          onChange={(e) => {
            const next = e.target.checked;
            startTransition(async () => {
              const result = await setCategoryActiveAction(row.id, next);
              if (!result.ok) {
                onToggleError(result.message ?? "อัปเดตสถานะไม่สำเร็จ");
              }
            });
          }}
        />
        <div className="flex items-center">
          <button
            type="button"
            onClick={onEdit}
            aria-label="แก้ไขหมวดหมู่"
            className="inline-flex items-center justify-center size-9 rounded-full text-on-surface-variant hover:bg-surface-container-high transition-colors"
          >
            <Icon name="edit" size={18} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label="ลบหมวดหมู่"
            className="inline-flex items-center justify-center size-9 rounded-full text-error hover:bg-error-container/40 transition-colors"
          >
            <Icon name="delete" size={18} />
          </button>
        </div>
      </div>
    </li>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="bg-surface-container-lowest border border-dashed border-outline-variant rounded-xl p-8 md:p-12 text-center">
      <div className="w-16 h-16 mx-auto rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant mb-4">
        <Icon name="category" size={32} />
      </div>
      <p className="text-body-md text-on-surface">ยังไม่มีหมวดหมู่</p>
      <p className="text-label-md text-on-surface-variant mt-1 mb-4">
        กดปุ่ม &ldquo;เพิ่มหมวดหมู่&rdquo; เพื่อสร้างหมวดแรก
      </p>
      <Button onClick={onAdd} rounded="full" iconLeft={<Icon name="add" />}>
        เพิ่มหมวดหมู่
      </Button>
    </div>
  );
}
