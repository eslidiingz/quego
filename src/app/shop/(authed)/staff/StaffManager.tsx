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
import { PageHeader } from "@/components/layout/PageHeader";
import { TourHelpButton } from "@/components/tour/TourHelpButton";
import { TOUR_ANCHORS } from "@/lib/tour/anchors";
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
export function StaffManager({
  staff,
  services,
}: {
  staff: StaffListItem[];
  services: { id: string; name: string }[];
}) {
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

  // Resolve a staff member's assigned service IDs to names for the row chips.
  const serviceNameById = new Map(services.map((s) => [s.id, s.name]));

  return (
    <div className="space-y-stack-md">
      <PageHeader
        eyebrow="จัดการทีมงาน"
        title="พนักงาน"
        description="เพิ่มและจัดการพนักงานของร้าน จำนวนพนักงานที่เปิดใช้งานกำหนดว่ารับได้กี่คิวพร้อมกันในแต่ละช่วงเวลา"
        help={<TourHelpButton tourId="shop-staff" />}
        action={
          <Button
            size="sm"
            iconLeft={<Icon name="person_add" size={18} />}
            onClick={openAdd}
            data-tour={TOUR_ANCHORS.staffAdd}
          >
            เพิ่มพนักงาน
          </Button>
        }
      />

      <section className="space-y-stack-md">
        {staff.length === 0 ? (
          <EmptyState onAdd={openAdd} />
        ) : (
          <ul className="space-y-3">
            {staff.map((member) => (
              <StaffRow
                key={member.id}
                member={member}
                serviceNameById={serviceNameById}
                hasServices={services.length > 0}
                onEdit={() => openEdit(member)}
              />
            ))}
          </ul>
        )}
      </section>

      {dialogOpen ? (
        <StaffFormModal
          editing={editing}
          services={services}
          onClose={() => setDialogOpen(false)}
        />
      ) : null}
    </div>
  );
}

function StaffRow({
  member,
  serviceNameById,
  hasServices,
  onEdit,
}: {
  member: StaffListItem;
  serviceNameById: Map<string, string>;
  hasServices: boolean;
  onEdit: () => void;
}) {
  const [pending, startTransition] = useTransition();

  // Map the assigned service IDs to names (skip any that no longer exist).
  const assignedNames = member.serviceIds
    .map((id) => serviceNameById.get(id))
    .filter((n): n is string => Boolean(n));

  return (
    <li
      data-tour={TOUR_ANCHORS.staffRow}
      className={`bg-surface-container-lowest border border-outline-variant rounded-xl p-4 md:p-5 flex items-start gap-3 ${
        member.isActive ? "" : "opacity-60"
      }`}
    >
      <span className="flex items-center justify-center size-11 rounded-full bg-primary-container text-on-primary-container shrink-0 mt-0.5">
        <Icon name="person" />
      </span>

      {/* content */}
      <div className="min-w-0 flex-1 space-y-1">
        <h3 className="font-display font-bold text-headline-sm text-on-surface leading-tight">
          {member.name}
        </h3>
        <div className="flex items-center gap-2 flex-wrap">
          {member.role ? (
            <Chip variant="neutral" size="sm">{member.role}</Chip>
          ) : null}
          {member.phone ? (
            <span className="text-label-md text-on-surface-variant/60">
              {formatPhone(member.phone)}
            </span>
          ) : null}
        </div>
        {!member.providesService ? (
          <span className="inline-flex items-center gap-1 text-label-sm text-on-surface-variant/60">
            <Icon name="block" size={14} />
            ไม่ให้บริการ
          </span>
        ) : hasServices ? (
          <div className="flex items-center gap-1.5 flex-wrap">
            {assignedNames.length === 0 ? (
              <span className="inline-flex items-center gap-1 text-label-sm text-on-surface-variant">
                <Icon name="stacks" size={14} />
                ทุกบริการ
              </span>
            ) : (
              assignedNames.map((n) => (
                <Chip key={n} variant="confirmed" size="sm">{n}</Chip>
              ))
            )}
          </div>
        ) : null}
      </div>

      {/* right column: switch + actions */}
      <div
        data-tour={TOUR_ANCHORS.staffRowControls}
        className="flex flex-col items-end gap-2 shrink-0"
      >
        <Switch
          checked={member.isActive}
          disabled={pending}
          aria-label={member.isActive ? "ปิดการใช้งานพนักงาน" : "เปิดการใช้งานพนักงาน"}
          onChange={(e) => {
            const next = e.target.checked;
            startTransition(() => setStaffActiveAction(member.id, next));
          }}
        />
        <div className="flex items-center">
          <button
            type="button"
            onClick={onEdit}
            aria-label="แก้ไขพนักงาน"
            className="inline-flex items-center justify-center size-9 rounded-full text-on-surface-variant hover:bg-surface-container-high transition-colors"
          >
            <Icon name="edit" size={18} />
          </button>
          <ConfirmDialog
            trigger={
              <button
                type="button"
                aria-label="ลบพนักงาน"
                className="inline-flex items-center justify-center size-9 rounded-full text-error hover:bg-error-container/40 transition-colors"
              >
                <Icon name="delete" size={18} />
              </button>
            }
            title="ลบพนักงานคนนี้?"
            description={`"${member.name}" จะถูกลบออกจากรายชื่อ ประวัติการจองเดิมยังอยู่แต่จะไม่ผูกกับพนักงานคนนี้`}
            confirmLabel="ลบ"
            cancelLabel="ยกเลิก"
            destructive
            onConfirm={() => deleteStaffAction(member.id)}
          />
        </div>
      </div>

    </li>
  );
}

function StaffFormModal({
  editing,
  services,
  onClose,
}: {
  editing: StaffListItem | null;
  services: { id: string; name: string }[];
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState<StaffFormState, FormData>(
    saveStaffAction,
    null,
  );
  const [errors, setErrors] = useState<StaffFormErrors>({});

  // Three service modes: "all" = serves every service (no specific rows),
  // "some" = only the checked services, "none" = back-of-house (manager,
  // housekeeper) who serves nothing. Derive the initial mode when editing.
  const [serviceMode, setServiceMode] = useState<"all" | "some" | "none">(
    () => {
      if (!editing) return "all";
      if (!editing.providesService) return "none";
      return editing.serviceIds.length === 0 ? "all" : "some";
    },
  );
  const [selectedServiceIds, setSelectedServiceIds] = useState<Set<string>>(
    () => new Set(editing?.serviceIds ?? []),
  );

  const toggleService = (id: string) =>
    setSelectedServiceIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // Close on a successful save. State only flips to ok after a real submit
  // (the component mounts fresh per open, so there's no stale success).
  useEffect(() => {
    if (state?.ok) onClose();
  }, [state, onClose]);

  // "เลือกบางบริการ" with nothing checked is incoherent — block it client-side.
  const serviceSelectionInvalid =
    services.length > 0 && serviceMode === "some" && selectedServiceIds.size === 0;

  function clientAction(formData: FormData) {
    const fieldErrors = validateStaffForm(parseStaffFormData(formData));
    if (hasStaffErrors(fieldErrors) || serviceSelectionInvalid) {
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

        {services.length > 0 ? (
          <fieldset className="space-y-3 border-t border-outline-variant pt-4">
            <legend className="text-label-md text-on-surface font-semibold">
              บริการที่ให้บริการได้
            </legend>

            {/* "some" emits the checked ids; "all" and "none" emit none. The
                action reads `serviceMode` (the checked radio's value) to tell
                "all" and "none" apart. */}
            {serviceMode === "some"
              ? [...selectedServiceIds].map((id) => (
                  <input key={id} type="hidden" name="serviceIds" value={id} />
                ))
              : null}

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="serviceMode"
                value="all"
                checked={serviceMode === "all"}
                onChange={() => setServiceMode("all")}
                className="size-4 accent-primary"
              />
              <span className="text-body-md text-on-surface">
                ทุกบริการ
                <span className="text-on-surface-variant"> (ค่าเริ่มต้น)</span>
              </span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="serviceMode"
                value="some"
                checked={serviceMode === "some"}
                onChange={() => setServiceMode("some")}
                className="size-4 accent-primary"
              />
              <span className="text-body-md text-on-surface">เลือกบางบริการ</span>
            </label>

            {serviceMode === "some" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-7">
                {services.map((svc) => (
                  <label
                    key={svc.id}
                    className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${
                      selectedServiceIds.has(svc.id)
                        ? "border-primary bg-primary/5"
                        : "border-outline-variant hover:bg-surface-container-high"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedServiceIds.has(svc.id)}
                      onChange={() => toggleService(svc.id)}
                      className="size-4 accent-primary"
                    />
                    <span className="text-label-md text-on-surface truncate">
                      {svc.name}
                    </span>
                  </label>
                ))}
              </div>
            ) : null}

            {serviceSelectionInvalid ? (
              <p className="text-label-sm text-on-surface-variant pl-7">
                ยังไม่ได้เลือกบริการ — เลือกอย่างน้อย 1 อย่าง หรือกลับไปเลือก &ldquo;ทุกบริการ&rdquo;
              </p>
            ) : null}

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="serviceMode"
                value="none"
                checked={serviceMode === "none"}
                onChange={() => setServiceMode("none")}
                className="size-4 accent-primary"
              />
              <span className="text-body-md text-on-surface">
                ไม่มีบริการ
                <span className="text-on-surface-variant"> (เช่น ผู้จัดการ, แม่บ้าน)</span>
              </span>
            </label>
          </fieldset>
        ) : null}

        <label className="flex items-center justify-between gap-4 pt-1">
          <span className="text-label-md text-on-surface">
            {serviceMode === "none" ? "เปิดใช้งาน (แสดงในทีม)" : "เปิดใช้งาน (รับคิวได้)"}
          </span>
          <Switch name="isActive" defaultChecked={editing ? editing.isActive : true} />
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
          <Button
            type="submit"
            disabled={pending || serviceSelectionInvalid}
            fullWidth
            className="flex-1"
          >
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
