"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Chip } from "@/components/ui/Chip";
import {
  CategoryFormDialog,
  type CategoryEditing,
} from "./CategoryFormDialog";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";

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

export function CategoriesTable({ rows }: { rows: CategoryRow[] }) {
  const [editing, setEditing] = useState<CategoryEditing>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [toast, setToast] = useState<Toast>(null);

  const showToast = (kind: Toast extends infer T ? (T extends { kind: infer K } ? K : never) : never, message: string) => {
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
        >
          เพิ่มหมวดหมู่
        </Button>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
        {rows.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant mb-4">
              <Icon name="category" size={32} />
            </div>
            <p className="text-body-md text-on-surface">ยังไม่มีหมวดหมู่</p>
            <p className="text-label-md text-on-surface-variant mt-1">
              กดปุ่ม &ldquo;เพิ่มหมวดหมู่&rdquo; เพื่อสร้างหมวดแรก
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface-container-low border-b border-outline-variant">
                <tr className="text-label-sm uppercase tracking-wider text-on-surface-variant">
                  <th className="px-6 py-3 w-12">#</th>
                  <th className="px-6 py-3">ชื่อ</th>
                  <th className="px-6 py-3 hidden md:table-cell">Slug</th>
                  <th className="px-6 py-3 hidden lg:table-cell">ไอคอน</th>
                  <th className="px-6 py-3">สถานะ</th>
                  <th className="px-6 py-3 w-32 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-outline-variant/40 last:border-b-0 hover:bg-surface-container-low/50 transition-colors"
                  >
                    <td className="px-6 py-4 text-body-md text-on-surface-variant">
                      {row.sort_order}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {row.icon ? (
                          <span className="w-10 h-10 rounded-lg bg-primary-container/10 text-primary flex items-center justify-center">
                            <Icon name={row.icon} />
                          </span>
                        ) : null}
                        <span className="font-medium text-on-surface">{row.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      <code className="text-label-sm text-on-surface-variant bg-surface-container px-2 py-1 rounded">
                        {row.slug}
                      </code>
                    </td>
                    <td className="px-6 py-4 hidden lg:table-cell text-label-md text-on-surface-variant">
                      {row.icon ?? "—"}
                    </td>
                    <td className="px-6 py-4">
                      {row.is_active ? (
                        <Chip variant="waiting" size="sm">เปิดใช้งาน</Chip>
                      ) : (
                        <Chip variant="neutral" size="sm">ปิด</Chip>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setEditing(row)}
                          aria-label="แก้ไข"
                          className="p-2 rounded-full text-on-surface-variant hover:bg-surface-container-high hover:text-primary transition-colors"
                        >
                          <Icon name="edit" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget({ id: row.id, name: row.name })}
                          aria-label="ลบ"
                          className="p-2 rounded-full text-on-surface-variant hover:bg-error/10 hover:text-error transition-colors"
                        >
                          <Icon name="delete" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
