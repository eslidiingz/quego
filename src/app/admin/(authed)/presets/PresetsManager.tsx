"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Chip } from "@/components/ui/Chip";
import { Switch } from "@/components/ui/Switch";
import type { ServicePresetListItem } from "@/lib/services/service-presets";
import { PresetFormDialog, type PresetEditing } from "./PresetFormDialog";
import { DeletePresetDialog } from "./DeletePresetDialog";
import { setPresetActiveAction } from "./actions";

type Toast = { kind: "success" | "error"; message: string } | null;

/**
 * Preset list + CRUD orchestration for one category (the active tab). Receives
 * the category's presets as a prop (the server page reads them) and owns only
 * UI state: the add/edit dialog, the delete confirm, the active toggle, and a
 * toast. SRP: list layout + dialog orchestration. A single row lives in
 * `PresetRow`; the form in `PresetFormDialog`.
 */
export function PresetsManager({
  categoryId,
  categoryName,
  presets,
}: {
  categoryId: string;
  categoryName: string;
  presets: ServicePresetListItem[];
}) {
  const [editing, setEditing] = useState<PresetEditing>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(
    null,
  );
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
          {presets.length === 0
            ? `ยังไม่มีบริการ preset ในหมวด "${categoryName}"`
            : `หมวด "${categoryName}" · ${presets.length} บริการ`}
        </p>
        <Button
          onClick={() => setCreateOpen(true)}
          rounded="full"
          iconLeft={<Icon name="add" />}
        >
          เพิ่มบริการ preset
        </Button>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
        {presets.length === 0 ? (
          <EmptyState onAdd={() => setCreateOpen(true)} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface-container-low border-b border-outline-variant">
                <tr className="text-label-sm uppercase tracking-wider text-on-surface-variant">
                  <th className="px-6 py-3 w-12">#</th>
                  <th className="px-6 py-3">บริการ</th>
                  <th className="px-6 py-3">ระยะเวลา</th>
                  <th className="px-6 py-3 hidden sm:table-cell">ราคา</th>
                  <th className="px-6 py-3">ใช้งาน</th>
                  <th className="px-6 py-3 w-28 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {presets.map((preset) => (
                  <PresetRow
                    key={preset.id}
                    preset={preset}
                    onEdit={() => setEditing(preset)}
                    onDelete={() => setDeleteTarget({ id: preset.id, name: preset.name })}
                    onToggleError={(msg) => showToast("error", msg)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <PresetFormDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        categoryId={categoryId}
        categoryName={categoryName}
        editing={null}
        onSuccess={(msg) => showToast("success", msg)}
      />
      <PresetFormDialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        categoryId={categoryId}
        categoryName={categoryName}
        editing={editing}
        onSuccess={(msg) => showToast("success", msg)}
      />
      {deleteTarget ? (
        <DeletePresetDialog
          open={deleteTarget !== null}
          onClose={() => setDeleteTarget(null)}
          presetId={deleteTarget.id}
          presetName={deleteTarget.name}
          onResult={(ok, msg) => showToast(ok ? "success" : "error", msg)}
        />
      ) : null}
    </div>
  );
}

function PresetRow({
  preset,
  onEdit,
  onDelete,
  onToggleError,
}: {
  preset: ServicePresetListItem;
  onEdit: () => void;
  onDelete: () => void;
  onToggleError: (message: string) => void;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <tr
      className={
        "border-b border-outline-variant/40 last:border-b-0 hover:bg-surface-container-low/50 transition-colors " +
        (preset.isActive ? "" : "opacity-60")
      }
    >
      <td className="px-6 py-4 text-body-md text-on-surface-variant">
        {preset.sortOrder + 1}
      </td>
      <td className="px-6 py-4">
        <div className="min-w-0">
          <span className="font-medium text-on-surface block">{preset.name}</span>
          {preset.description ? (
            <span className="text-label-sm text-on-surface-variant line-clamp-1">
              {preset.description}
            </span>
          ) : null}
        </div>
      </td>
      <td className="px-6 py-4">
        <Chip variant="neutral" size="sm">
          {preset.durationMinutes} นาที
        </Chip>
      </td>
      <td className="px-6 py-4 hidden sm:table-cell">
        {preset.price != null ? (
          <Chip variant="success" size="sm">
            {formatBaht(preset.price)}
          </Chip>
        ) : (
          <span className="text-on-surface-variant">—</span>
        )}
      </td>
      <td className="px-6 py-4">
        <Switch
          checked={preset.isActive}
          disabled={pending}
          aria-label={preset.isActive ? "ปิดการใช้งาน preset" : "เปิดการใช้งาน preset"}
          onChange={(e) => {
            const next = e.target.checked;
            startTransition(async () => {
              const result = await setPresetActiveAction(preset.id, next);
              if (!result.ok) {
                onToggleError(result.message ?? "อัปเดตสถานะไม่สำเร็จ");
              }
            });
          }}
        />
      </td>
      <td className="px-6 py-4">
        <div className="flex justify-end items-center gap-1">
          <button
            type="button"
            onClick={onEdit}
            aria-label="แก้ไข"
            className="inline-flex items-center justify-center size-10 rounded-full text-on-surface-variant hover:bg-surface-container-high hover:text-primary transition-colors"
          >
            <Icon name="edit" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label="ลบ"
            className="inline-flex items-center justify-center size-10 rounded-full text-on-surface-variant hover:bg-error/10 hover:text-error transition-colors"
          >
            <Icon name="delete" />
          </button>
        </div>
      </td>
    </tr>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="p-12 text-center">
      <div className="w-16 h-16 mx-auto rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant mb-4">
        <Icon name="stacks" size={32} />
      </div>
      <p className="text-body-md text-on-surface">ยังไม่มีบริการ preset ในหมวดนี้</p>
      <p className="text-label-md text-on-surface-variant mt-1 mb-4">
        เพิ่ม preset เพื่อให้ร้านในหมวดนี้เลือกไปใช้ได้ในคลิกเดียว
      </p>
      <Button onClick={onAdd} rounded="full" iconLeft={<Icon name="add" />}>
        เพิ่มบริการ preset
      </Button>
    </div>
  );
}

function formatBaht(price: number): string {
  return `${price.toLocaleString("th-TH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} บาท`;
}
