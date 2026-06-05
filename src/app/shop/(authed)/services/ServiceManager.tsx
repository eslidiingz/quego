"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Switch } from "@/components/ui/Switch";
import { Modal } from "@/components/ui/Modal";
import { Chip } from "@/components/ui/Chip";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  parseServiceFormData,
  validateServiceForm,
  hasServiceErrors,
  type ServiceFormErrors,
} from "@/lib/validation/shop";
import type { ShopServiceListItem } from "@/lib/services/services";
import type { ServicePresetListItem } from "@/lib/services/service-presets";
import {
  saveServiceAction,
  setServiceActiveAction,
  deleteServiceAction,
  deleteAllServicesAction,
  importPresetsAction,
  type ServiceFormState,
} from "./actions";

/**
 * Service catalogue manager (shop owner). Renders the list and owns the
 * add/edit dialog + delete confirm + active toggle, plus a "เลือกจาก preset"
 * importer that copies the category's curated presets into the catalogue.
 * Data comes in as props (the server page reads it); this component only
 * handles UI state and calls the server actions.
 *
 * SRP: list layout + dialog orchestration. The form lives in `ServiceFormModal`,
 * a row in `ServiceRow`, and the preset importer in `PresetImportModal`.
 */
export function ServiceManager({
  services,
  presets,
  categoryName,
}: {
  services: ShopServiceListItem[];
  presets: ServicePresetListItem[];
  categoryName: string | null;
}) {
  const [editing, setEditing] = useState<ShopServiceListItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [toast, setToast] = useState<
    { kind: "success" | "error"; message: string } | null
  >(null);

  function openAdd() {
    setEditing(null);
    setDialogOpen(true);
  }
  function openEdit(service: ShopServiceListItem) {
    setEditing(service);
    setDialogOpen(true);
  }
  function showToast(kind: "success" | "error", message: string) {
    setToast({ kind, message });
    window.setTimeout(() => setToast(null), 4000);
  }

  // Names already in the catalogue — preset tiles matching these are shown as
  // "already added" and can't be re-selected.
  const existingNames = new Set(
    services.map((s) => s.name.trim().toLowerCase()),
  );

  return (
    <div className="space-y-stack-md">
      <PageHeader
        eyebrow="จัดการบริการ"
        title="บริการ"
        description="เพิ่มและจัดการบริการของร้าน เช่น ตัดผม ทำสี ดัดวอลลุ่ม ระยะเวลาของแต่ละบริการกำหนดรอบเวลาที่ลูกค้าจองได้"
        action={
          <Button size="sm" onClick={openAdd}>
            เพิ่มบริการ
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

      {presets.length > 0 ? (
        <PresetImportBar
          categoryName={categoryName}
          count={presets.length}
          onOpen={() => setImportOpen(true)}
        />
      ) : null}

      <section className="space-y-stack-md">
        {services.length === 0 ? (
          <EmptyState onAdd={openAdd} />
        ) : (
          <>
            <ul className="space-y-3">
              {services.map((service) => (
                <ServiceRow
                  key={service.id}
                  service={service}
                  onEdit={() => openEdit(service)}
                />
              ))}
            </ul>
            <div className="flex justify-end">
              <ConfirmDialog
                trigger={
                  <button
                    type="button"
                    className="text-label-md text-error hover:underline"
                  >
                    ลบบริการทั้งหมด
                  </button>
                }
                title="ลบบริการทั้งหมด?"
                description={`บริการทั้ง ${services.length} รายการจะถูกลบออก ประวัติการจองเดิมยังอยู่แต่จะไม่ผูกกับบริการเหล่านี้`}
                confirmLabel="ลบทั้งหมด"
                cancelLabel="ยกเลิก"
                destructive
                onConfirm={() => deleteAllServicesAction()}
              />
            </div>
          </>
        )}
      </section>

      {dialogOpen ? (
        <ServiceFormModal
          editing={editing}
          onClose={() => setDialogOpen(false)}
        />
      ) : null}

      {importOpen ? (
        <PresetImportModal
          presets={presets}
          categoryName={categoryName}
          existingNames={existingNames}
          onClose={() => setImportOpen(false)}
          onResult={(kind, message) => showToast(kind, message)}
        />
      ) : null}
    </div>
  );
}

function ServiceRow({
  service,
  onEdit,
}: {
  service: ShopServiceListItem;
  onEdit: () => void;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <li
      className={`bg-surface-container-lowest border border-outline-variant rounded-xl p-4 md:p-5 flex items-start gap-3 ${
        service.isActive ? "" : "opacity-70"
      }`}
    >
      <div className="min-w-0 flex-1 space-y-1">
        <h3 className="font-display font-bold text-headline-sm text-on-surface leading-tight">
          {service.name}
        </h3>
        <div className="flex items-center gap-2 flex-wrap">
          <Chip variant="neutral" size="sm">
            {service.durationMinutes} นาที
          </Chip>
          {service.price != null ? (
            <Chip variant="success" size="sm">
              {formatBaht(service.price)}
            </Chip>
          ) : null}
        </div>
        {service.description ? (
          <p className="text-label-md text-on-surface-variant/60 line-clamp-2">
            {service.description}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col items-end gap-2 shrink-0">
        <Switch
          checked={service.isActive}
          disabled={pending}
          aria-label={
            service.isActive ? "ปิดการใช้งานบริการ" : "เปิดการใช้งานบริการ"
          }
          onChange={(e) => {
            const next = e.target.checked;
            startTransition(() => setServiceActiveAction(service.id, next));
          }}
        />
        <div className="flex items-center">
          <button
            type="button"
            onClick={onEdit}
            aria-label="แก้ไขบริการ"
            className="inline-flex items-center justify-center size-9 rounded-full text-on-surface-variant hover:bg-surface-container-high transition-colors"
          >
            <Icon name="edit" size={18} />
          </button>
          <ConfirmDialog
            trigger={
              <button
                type="button"
                aria-label="ลบบริการ"
                className="inline-flex items-center justify-center size-9 rounded-full text-error hover:bg-error-container/40 transition-colors"
              >
                <Icon name="delete" size={18} />
              </button>
            }
            title="ลบบริการนี้?"
            description={`"${service.name}" จะถูกลบออกจากรายการ ประวัติการจองเดิมยังอยู่แต่จะไม่ผูกกับบริการนี้`}
            confirmLabel="ลบ"
            cancelLabel="ยกเลิก"
            destructive
            onConfirm={() => deleteServiceAction(service.id)}
          />
        </div>
      </div>
    </li>
  );
}

function ServiceFormModal({
  editing,
  onClose,
}: {
  editing: ShopServiceListItem | null;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState<
    ServiceFormState,
    FormData
  >(saveServiceAction, null);
  const [errors, setErrors] = useState<ServiceFormErrors>({});

  // Close on a successful save. State only flips to ok after a real submit
  // (the component mounts fresh per open, so there's no stale success).
  useEffect(() => {
    if (state?.ok) onClose();
  }, [state, onClose]);

  function clientAction(formData: FormData) {
    const fieldErrors = validateServiceForm(parseServiceFormData(formData));
    if (hasServiceErrors(fieldErrors)) {
      setErrors(fieldErrors);
      return; // do not call the server on invalid input
    }
    setErrors({});
    formAction(formData);
  }

  const clearErr = (key: keyof ServiceFormErrors) => () =>
    setErrors((e) => ({ ...e, [key]: undefined }));

  // Constrain input format at the source: digits only for duration, digits +
  // a single decimal point for price. Keeps the field honest before submit.
  function handleDurationInput(e: React.FormEvent<HTMLInputElement>) {
    e.currentTarget.value = e.currentTarget.value.replace(/[^0-9]/g, "");
    clearErr("durationMinutes")();
  }
  function handlePriceInput(e: React.FormEvent<HTMLInputElement>) {
    const el = e.currentTarget;
    let v = el.value.replace(/[^0-9.]/g, "");
    const parts = v.split(".");
    if (parts.length > 2) v = `${parts[0]}.${parts.slice(1).join("")}`;
    el.value = v;
    clearErr("price")();
  }

  return (
    <Modal open onClose={onClose} title={editing ? "แก้ไขบริการ" : "เพิ่มบริการ"}>
      <form action={clientAction} noValidate className="space-y-5">
        {editing ? (
          <input type="hidden" name="serviceId" value={editing.id} />
        ) : null}

        {state && !state.ok ? (
          <p className="rounded-lg bg-error-container/50 text-on-error-container text-label-md px-4 py-3">
            {state.message}
          </p>
        ) : null}

        <Input
          name="name"
          label="ชื่อบริการ"
          required
          defaultValue={editing?.name ?? ""}
          placeholder="เช่น ตัดผมชาย"
          errorText={errors.name}
          onChange={clearErr("name")}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            name="durationMinutes"
            label="ระยะเวลา (นาที)"
            required
            inputMode="numeric"
            defaultValue={editing ? String(editing.durationMinutes) : ""}
            placeholder="เช่น 30"
            helperText="เป็นจำนวนเท่าของ 10 นาที"
            errorText={errors.durationMinutes}
            onChange={handleDurationInput}
          />
          <Input
            name="price"
            label="ราคา (บาท)"
            inputMode="decimal"
            defaultValue={editing?.price != null ? String(editing.price) : ""}
            placeholder="เช่น 200 (ไม่บังคับ)"
            helperText="เว้นว่างได้หากไม่ระบุราคา"
            errorText={errors.price}
            onChange={handlePriceInput}
          />
        </div>

        <Textarea
          name="description"
          label="รายละเอียด"
          rows={3}
          defaultValue={editing?.description ?? ""}
          placeholder="อธิบายบริการเพิ่มเติม (ไม่บังคับ)"
          errorText={errors.description}
          onChange={clearErr("description")}
        />

        <label className="flex items-center justify-between gap-4 pt-1">
          <span className="text-label-md text-on-surface">
            เปิดให้จอง (แสดงในหน้าจองของลูกค้า)
          </span>
          <Switch
            name="isActive"
            defaultChecked={editing ? editing.isActive : true}
          />
        </label>

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

/**
 * Slim call-to-action that surfaces the category's curated presets as a
 * one-click way to seed the catalogue. Only rendered when presets exist.
 */
function PresetImportBar({
  categoryName,
  count,
  onOpen,
}: {
  categoryName: string | null;
  count: number;
  onOpen: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary-container/10 p-4">
      <div className="min-w-0 flex-1">
        <p className="text-label-md font-bold text-on-surface">
          ชุดบริการสำเร็จรูป{categoryName ? ` · ${categoryName}` : ""}
        </p>
        <p className="text-label-sm text-on-surface-variant">
          เลือกจากบริการยอดนิยม {count} รายการ มาเพิ่มได้ในคลิกเดียว
        </p>
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={onOpen}
        className="shrink-0"
      >
        เลือก preset
      </Button>
    </div>
  );
}

/**
 * Preset picker. Lists the category's active presets as selectable tiles;
 * presets already in the catalogue (by name) are shown as "เพิ่มแล้ว" and can't
 * be re-selected. On confirm it copies the selected presets server-side and
 * reports added/skipped counts back to the manager's toast.
 */
function PresetImportModal({
  presets,
  categoryName,
  existingNames,
  onClose,
  onResult,
}: {
  presets: ServicePresetListItem[];
  categoryName: string | null;
  existingNames: Set<string>;
  onClose: () => void;
  onResult: (kind: "success" | "error", message: string) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const selectablePresets = presets.filter(
    (p) => !existingNames.has(p.name.trim().toLowerCase()),
  );
  const allSelected =
    selectablePresets.length > 0 &&
    selectablePresets.every((p) => selected.has(p.id));

  function toggle(id: string) {
    setError(null);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setError(null);
    setSelected((prev) => {
      const next = new Set(prev);
      const everySelected = selectablePresets.every((p) => next.has(p.id));
      for (const p of selectablePresets) {
        if (everySelected) next.delete(p.id);
        else next.add(p.id);
      }
      return next;
    });
  }

  function submit() {
    if (selected.size === 0) {
      setError("กรุณาเลือกอย่างน้อย 1 บริการ");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await importPresetsAction([...selected]);
      if (result.ok) {
        const msg =
          result.added > 0
            ? `เพิ่ม ${result.added} บริการแล้ว` +
              (result.skipped > 0 ? ` (ข้าม ${result.skipped} ที่มีอยู่แล้ว)` : "")
            : "บริการที่เลือกมีอยู่ในรายการแล้วทั้งหมด";
        onResult("success", msg);
        onClose();
      } else {
        setError(result.message);
      }
    });
  }

  return (
    <Modal
      open
      onClose={pending ? () => undefined : onClose}
      title="เลือกจาก preset"
      size="lg"
    >
      <p className="text-label-md text-on-surface-variant -mt-2 mb-4">
        ชุดบริการสำเร็จรูป{categoryName ? ` ของหมวด ${categoryName}` : ""} —
        เลือกบริการที่ต้องการเพิ่มเข้าร้าน สามารถแก้ไขข้อมูลภายหลังได้
      </p>

      {selectablePresets.length > 0 ? (
        <div className="flex items-center justify-between mb-2">
          <span className="text-label-md text-on-surface-variant">
            {selected.size > 0
              ? `เลือกแล้ว ${selected.size} รายการ`
              : `ทั้งหมด ${selectablePresets.length} รายการ`}
          </span>
          <button
            type="button"
            onClick={toggleAll}
            disabled={pending}
            className="text-label-md font-medium text-primary hover:underline disabled:opacity-50"
          >
            {allSelected ? "ล้างการเลือก" : "เลือกทั้งหมด"}
          </button>
        </div>
      ) : null}

      <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
        {presets.map((preset) => {
          const already = existingNames.has(preset.name.trim().toLowerCase());
          const isSelected = selected.has(preset.id);
          return (
            <button
              key={preset.id}
              type="button"
              disabled={already || pending}
              onClick={() => toggle(preset.id)}
              aria-pressed={isSelected}
              className={
                "w-full text-left rounded-xl border p-3 flex items-center gap-3 transition-colors " +
                (already
                  ? "border-outline-variant bg-surface-container-low/40 opacity-60 cursor-not-allowed"
                  : isSelected
                    ? "border-primary bg-primary-container/20"
                    : "border-outline-variant hover:bg-surface-container-low/60")
              }
            >
              <span
                className={
                  "flex items-center justify-center size-6 rounded-md border shrink-0 " +
                  (isSelected && !already
                    ? "bg-primary border-primary text-on-primary"
                    : "border-outline-variant text-transparent")
                }
                aria-hidden="true"
              >
                <Icon name="check" size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-on-surface truncate">{preset.name}</p>
                <div className="flex items-center gap-2 flex-wrap mt-0.5">
                  <Chip variant="neutral" size="sm">
                    {preset.durationMinutes} นาที
                  </Chip>
                  {preset.price != null ? (
                    <Chip variant="success" size="sm">
                      {formatBaht(preset.price)}
                    </Chip>
                  ) : null}
                </div>
              </div>
              {already ? (
                <Chip variant="neutral" size="sm">
                  เพิ่มแล้ว
                </Chip>
              ) : null}
            </button>
          );
        })}
      </div>

      {error ? (
        <div
          role="alert"
          className="mt-4 text-label-md text-error bg-error-container/40 border border-error/30 rounded-lg px-3 py-2"
        >
          {error}
        </div>
      ) : null}

      <div className="flex gap-3 mt-6">
        <Button
          variant="outline"
          onClick={onClose}
          disabled={pending}
          type="button"
          fullWidth
          className="flex-1 whitespace-nowrap"
          iconLeft={<Icon name="close" />}
        >
          ยกเลิก
        </Button>
        <Button
          type="button"
          onClick={submit}
          disabled={pending || selected.size === 0}
          fullWidth
          className="flex-1 whitespace-nowrap"
          iconLeft={
            pending ? (
              <Icon name="progress_activity" className="animate-spin" />
            ) : (
              <Icon name="library_add" />
            )
          }
        >
          {pending
            ? "กำลังเพิ่ม…"
            : selected.size > 0
              ? `เพิ่ม ${selected.size} บริการ`
              : "เพิ่มบริการ"}
        </Button>
      </div>
    </Modal>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="bg-surface-container-lowest border border-dashed border-outline-variant rounded-xl p-12 text-center space-y-3">
      <div className="w-16 h-16 mx-auto rounded-full bg-secondary-container/40 text-on-secondary-container flex items-center justify-center">
        <Icon name="stacks" size={32} />
      </div>
      <h2 className="font-display text-headline-md text-on-surface">
        ยังไม่มีบริการ
      </h2>
      <p className="text-body-md text-on-surface-variant max-w-md mx-auto">
        เพิ่มบริการเพื่อให้ลูกค้าเลือกตอนจองคิว แต่ละบริการกำหนดระยะเวลาของตัวเอง
        ซึ่งใช้คำนวณรอบเวลาที่ลูกค้าจองได้ — หรือเลือกจากชุดบริการสำเร็จรูป (preset) ด้านบน
      </p>
      <Button onClick={onAdd}>
        เพิ่มบริการแรก
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
