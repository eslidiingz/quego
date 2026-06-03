"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { Switch } from "@/components/ui/Switch";
import { Modal } from "@/components/ui/Modal";
import { Chip } from "@/components/ui/Chip";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Icon } from "@/components/ui/Icon";
import {
  parseStaffFormData,
  validateStaffForm,
  hasStaffErrors,
  type StaffFormErrors,
} from "@/lib/validation/shop";
import type { StaffListItem } from "@/lib/services/staff";
import {
  saveStaffAction,
  setStaffActiveAction,
  deleteStaffAction,
  type StaffFormState,
} from "./actions";

/**
 * Staff roster manager (shop owner). Renders the list and owns the
 * add/edit dialog + delete confirm + active toggle. Data comes in as a prop
 * (the server page reads it); this component only handles UI state and calls
 * the server actions.
 *
 * SRP: list layout + dialog orchestration. The form lives in `StaffFormModal`
 * and a single row in `StaffRow`.
 */
export function StaffManager({ staff }: { staff: StaffListItem[] }) {
  const [editing, setEditing] = useState<StaffListItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  function openAdd() {
    setEditing(null);
    setDialogOpen(true);
  }
  function openEdit(member: StaffListItem) {
    setEditing(member);
    setDialogOpen(true);
  }

  return (
    <section className="space-y-stack-md">
      <div className="flex items-center justify-between gap-4">
        <p className="text-on-surface-variant">
          พนักงานที่เปิดใช้งานแต่ละคนคือ 1 สายบริการ — รับลูกค้าพร้อมกันได้ตามจำนวนพนักงาน
        </p>
        <Button iconLeft={<Icon name="person_add" size={20} />} onClick={openAdd}>
          เพิ่มพนักงาน
        </Button>
      </div>

      {staff.length === 0 ? (
        <EmptyState onAdd={openAdd} />
      ) : (
        <ul className="space-y-3">
          {staff.map((member) => (
            <StaffRow key={member.id} member={member} onEdit={() => openEdit(member)} />
          ))}
        </ul>
      )}

      {dialogOpen ? (
        <StaffFormModal editing={editing} onClose={() => setDialogOpen(false)} />
      ) : null}
    </section>
  );
}

function StaffRow({
  member,
  onEdit,
}: {
  member: StaffListItem;
  onEdit: () => void;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <li
      className={`bg-surface-container-lowest border border-outline-variant rounded-xl p-4 md:p-5 flex items-center gap-4 ${
        member.isActive ? "" : "opacity-70"
      }`}
    >
      <span className="flex items-center justify-center size-11 rounded-full bg-secondary-container text-on-secondary-container shrink-0">
        <Icon name="person" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-display text-headline-sm text-on-surface truncate">
            {member.name}
            {member.nickname ? (
              <span className="text-on-surface-variant font-normal"> ({member.nickname})</span>
            ) : null}
          </h3>
          {member.role ? (
            <Chip variant="neutral" size="sm">
              {member.role}
            </Chip>
          ) : null}
        </div>
        <p className="text-label-md text-on-surface-variant mt-0.5">
          {member.phone ? formatPhone(member.phone) : "ไม่ระบุเบอร์โทร"}
        </p>
      </div>

      <Switch
        checked={member.isActive}
        disabled={pending}
        aria-label={member.isActive ? "ปิดการใช้งานพนักงาน" : "เปิดการใช้งานพนักงาน"}
        onChange={(e) => {
          const next = e.target.checked;
          startTransition(() => setStaffActiveAction(member.id, next));
        }}
      />

      <button
        type="button"
        onClick={onEdit}
        aria-label="แก้ไขพนักงาน"
        className="inline-flex items-center justify-center size-10 rounded-full text-on-surface-variant hover:bg-surface-container-high transition-colors"
      >
        <Icon name="edit" size={20} />
      </button>

      <ConfirmDialog
        trigger={
          <button
            type="button"
            aria-label="ลบพนักงาน"
            className="inline-flex items-center justify-center size-10 rounded-full text-error hover:bg-error-container/40 transition-colors"
          >
            <Icon name="delete" size={20} />
          </button>
        }
        title="ลบพนักงานคนนี้?"
        description={`"${member.name}" จะถูกลบออกจากรายชื่อ ประวัติการจองเดิมยังอยู่แต่จะไม่ผูกกับพนักงานคนนี้`}
        confirmLabel="ลบ"
        cancelLabel="ยกเลิก"
        destructive
        onConfirm={() => deleteStaffAction(member.id)}
      />
    </li>
  );
}

function StaffFormModal({
  editing,
  onClose,
}: {
  editing: StaffListItem | null;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState<StaffFormState, FormData>(
    saveStaffAction,
    null,
  );
  const [errors, setErrors] = useState<StaffFormErrors>({});

  // Close on a successful save. State only flips to ok after a real submit
  // (the component mounts fresh per open, so there's no stale success).
  useEffect(() => {
    if (state?.ok) onClose();
  }, [state, onClose]);

  function clientAction(formData: FormData) {
    const fieldErrors = validateStaffForm(parseStaffFormData(formData));
    if (hasStaffErrors(fieldErrors)) {
      setErrors(fieldErrors);
      return; // do not call the server on invalid input
    }
    setErrors({});
    formAction(formData);
  }

  const clearErr = (key: keyof StaffFormErrors) => () =>
    setErrors((e) => ({ ...e, [key]: undefined }));

  return (
    <Modal open onClose={onClose} title={editing ? "แก้ไขพนักงาน" : "เพิ่มพนักงาน"}>
      <form action={clientAction} noValidate className="space-y-5">
        {editing ? <input type="hidden" name="staffId" value={editing.id} /> : null}

        {state && !state.ok ? (
          <p className="rounded-lg bg-error-container/50 text-on-error-container text-label-md px-4 py-3">
            {state.message}
          </p>
        ) : null}

        <Input
          name="name"
          label="ชื่อ"
          required
          defaultValue={editing?.name ?? ""}
          placeholder="เช่น สมชาย ใจดี"
          errorText={errors.name}
          onChange={clearErr("name")}
        />
        <Input
          name="nickname"
          label="ชื่อเล่น"
          defaultValue={editing?.nickname ?? ""}
          placeholder="เช่น ชาย"
          errorText={errors.nickname}
          onChange={clearErr("nickname")}
        />
        <Input
          name="role"
          label="ตำแหน่ง/บทบาท"
          defaultValue={editing?.role ?? ""}
          placeholder="เช่น ช่างตัดผม"
          errorText={errors.role}
          onChange={clearErr("role")}
        />
        <PhoneInput
          name="phone"
          label="เบอร์โทร"
          defaultValue={editing?.phone ?? ""}
          placeholder="08X-XXX-XXXX"
          errorText={errors.phone}
          onChange={clearErr("phone")}
        />

        <label className="flex items-center justify-between gap-4 pt-1">
          <span className="text-label-md text-on-surface">เปิดใช้งาน (รับคิวได้)</span>
          <Switch name="isActive" defaultChecked={editing ? editing.isActive : true} />
        </label>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
            ยกเลิก
          </Button>
          <Button type="submit" disabled={pending}>
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
        <Icon name="groups" size={32} />
      </div>
      <h2 className="font-display text-headline-md text-on-surface">ยังไม่มีพนักงาน</h2>
      <p className="text-body-md text-on-surface-variant max-w-md mx-auto">
        เพิ่มพนักงานเพื่อเปิดรับหลายคิวพร้อมกันในช่วงเวลาเดียว
        หากยังไม่เพิ่ม ร้านจะรับได้ 1 คิวต่อช่วงเวลาเหมือนเดิม
      </p>
      <Button iconLeft={<Icon name="person_add" size={20} />} onClick={onAdd}>
        เพิ่มพนักงานคนแรก
      </Button>
    </div>
  );
}

function formatPhone(raw: string): string {
  if (raw.length === 10 && /^\d+$/u.test(raw)) {
    return `${raw.slice(0, 3)}-${raw.slice(3, 6)}-${raw.slice(6)}`;
  }
  return raw;
}
