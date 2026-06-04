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
import {
  saveServiceAction,
  setServiceActiveAction,
  deleteServiceAction,
  type ServiceFormState,
} from "./actions";

/**
 * Service catalogue manager (shop owner). Renders the list and owns the
 * add/edit dialog + delete confirm + active toggle. Data comes in as a prop
 * (the server page reads it); this component only handles UI state and calls
 * the server actions.
 *
 * SRP: list layout + dialog orchestration. The form lives in `ServiceFormModal`
 * and a single row in `ServiceRow`.
 */
export function ServiceManager({
  services,
}: {
  services: ShopServiceListItem[];
}) {
  const [editing, setEditing] = useState<ShopServiceListItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  function openAdd() {
    setEditing(null);
    setDialogOpen(true);
  }
  function openEdit(service: ShopServiceListItem) {
    setEditing(service);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-stack-md">
      <PageHeader
        eyebrow="จัดการบริการ"
        title="บริการ"
        description="เพิ่มและจัดการบริการของร้าน เช่น ตัดผม ทำสี ดัดวอลลุ่ม ระยะเวลาของแต่ละบริการกำหนดรอบเวลาที่ลูกค้าจองได้"
        action={
          <Button size="sm" iconLeft={<Icon name="add" size={18} />} onClick={openAdd}>
            เพิ่มบริการ
          </Button>
        }
      />

      <section className="space-y-stack-md">
        {services.length === 0 ? (
          <EmptyState onAdd={openAdd} />
        ) : (
          <ul className="space-y-3">
            {services.map((service) => (
              <ServiceRow
                key={service.id}
                service={service}
                onEdit={() => openEdit(service)}
              />
            ))}
          </ul>
        )}
      </section>

      {dialogOpen ? (
        <ServiceFormModal
          editing={editing}
          onClose={() => setDialogOpen(false)}
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
      <span className="flex items-center justify-center size-11 rounded-full bg-secondary-container text-on-secondary-container shrink-0 mt-0.5">
        <Icon name="stacks" />
      </span>

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
        เพิ่มบริการเพื่อให้ลูกค้าเลือกตอนจองคิว หากยังไม่เพิ่ม
        ระบบจะใช้ระยะเวลาบริการมาตรฐานของร้านเป็นค่าเริ่มต้น
      </p>
      <Button iconLeft={<Icon name="add" size={20} />} onClick={onAdd}>
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
