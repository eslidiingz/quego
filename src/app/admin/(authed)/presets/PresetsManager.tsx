"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Chip } from "@/components/ui/Chip";
import { Switch } from "@/components/ui/Switch";
import type { ServicePresetListItem } from "@/lib/services/service-presets";
import { formatBaht } from "@/lib/baht";
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
          fullWidth
          className="sm:w-auto"
        >
          เพิ่มบริการ preset
        </Button>
      </div>

      {presets.length === 0 ? (
        <EmptyState onAdd={() => setCreateOpen(true)} />
      ) : (
        <ul className="space-y-3">
          {presets.map((preset) => (
            <PresetRow
              key={preset.id}
              preset={preset}
              onEdit={() => setEditing(preset)}
              onDelete={() => setDeleteTarget({ id: preset.id, name: preset.name })}
              onToggleError={(msg) => showToast("error", msg)}
            />
          ))}
        </ul>
      )}

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
    <li
      className={
        "bg-surface-container-lowest border border-outline-variant rounded-xl p-4 md:p-5 flex items-start gap-3 transition-colors " +
        (preset.isActive ? "" : "opacity-70")
      }
    >
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="text-label-sm font-bold text-on-surface-variant tabular-nums shrink-0">
            #{preset.sortOrder + 1}
          </span>
          <h3 className="font-display font-bold text-headline-sm text-on-surface leading-tight truncate">
            {preset.name}
          </h3>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Chip variant="neutral" size="sm">
            {preset.durationMinutes} นาที
          </Chip>
          {preset.price != null ? (
            <Chip variant="success" size="sm">
              {formatBaht(preset.price)}
            </Chip>
          ) : null}
          {!preset.isActive ? (
            <Chip variant="neutral" size="sm">
              ปิดอยู่
            </Chip>
          ) : null}
        </div>
        {preset.description ? (
          <p className="text-label-md text-on-surface-variant/60 line-clamp-2">
            {preset.description}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col items-end gap-2 shrink-0">
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
        <div className="flex items-center">
          <button
            type="button"
            onClick={onEdit}
            aria-label="แก้ไข preset"
            className="inline-flex items-center justify-center size-9 rounded-full text-on-surface-variant hover:bg-surface-container-high transition-colors"
          >
            <Icon name="edit" size={18} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label="ลบ preset"
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
