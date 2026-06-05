"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Switch } from "@/components/ui/Switch";
import { Modal } from "@/components/ui/Modal";
import { Icon } from "@/components/ui/Icon";
import {
  parseServiceFormData,
  validateServiceForm,
  hasServiceErrors,
  type ServiceFormErrors,
} from "@/lib/validation/shop";
import {
  createPresetAction,
  updatePresetAction,
  type PresetFormState,
} from "./actions";

export type PresetEditing = {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  price: number | null;
  isActive: boolean;
} | null;

/**
 * Create/edit dialog for a category service preset. Validates on submit
 * (Rule 3) via the shared `validateServiceForm`, constrains duration/price at
 * the source (Rule 4), and binds to `createPresetAction(categoryId)` or
 * `updatePresetAction(presetId)`. SRP: just the form; list state lives in
 * `PresetsManager`.
 */
export function PresetFormDialog({
  open,
  onClose,
  categoryId,
  categoryName,
  editing,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  categoryId: string;
  categoryName: string;
  editing: PresetEditing;
  onSuccess: (message: string) => void;
}) {
  const action = editing
    ? updatePresetAction.bind(null, editing.id)
    : createPresetAction.bind(null, categoryId);
  const [state, formAction, pending] = useActionState<PresetFormState, FormData>(
    action,
    null,
  );
  const [errors, setErrors] = useState<ServiceFormErrors>({});

  // Close + report success once the server confirms.
  useEffect(() => {
    if (state?.ok) {
      onSuccess(state.message ?? "บันทึกเรียบร้อย");
      onClose();
    }
  }, [state, onSuccess, onClose]);

  // Error to show per field: client-side validation takes precedence, falling
  // back to any server-side field error (e.g. a duplicate name the client can't
  // know about). Merged at render — no setState-in-effect.
  const serverFieldErrors = state && !state.ok ? state.fieldErrors : undefined;
  const fieldError = (key: keyof ServiceFormErrors) =>
    errors[key] ?? serverFieldErrors?.[key];

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
  // a single decimal point for price.
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

  const title = editing ? "แก้ไขบริการ preset" : "เพิ่มบริการ preset";

  return (
    <Modal
      open={open}
      onClose={pending ? () => undefined : onClose}
      title={title}
      size="lg"
    >
      <p className="text-label-md text-on-surface-variant -mt-2 mb-4">
        หมวด <span className="font-bold text-on-surface">{categoryName}</span>
      </p>
      <form id="preset-form" action={clientAction} className="space-y-4" noValidate>
        <Input
          name="name"
          label="ชื่อบริการ"
          required
          defaultValue={editing?.name ?? ""}
          placeholder="เช่น ตัดผมชาย"
          errorText={fieldError("name")}
          onChange={clearErr("name")}
          disabled={pending}
          maxLength={120}
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
            errorText={fieldError("durationMinutes")}
            onChange={handleDurationInput}
            disabled={pending}
          />
          <Input
            name="price"
            label="ราคา (บาท)"
            inputMode="decimal"
            defaultValue={editing?.price != null ? String(editing.price) : ""}
            placeholder="เช่น 150 (ไม่บังคับ)"
            helperText="เว้นว่างได้หากไม่ระบุราคา"
            errorText={fieldError("price")}
            onChange={handlePriceInput}
            disabled={pending}
          />
        </div>
        <Textarea
          name="description"
          label="รายละเอียด"
          rows={3}
          defaultValue={editing?.description ?? ""}
          placeholder="อธิบายบริการเพิ่มเติม (ไม่บังคับ)"
          errorText={fieldError("description")}
          onChange={clearErr("description")}
          disabled={pending}
        />
        <label className="flex items-center justify-between gap-4 pt-1">
          <span className="text-label-md text-on-surface">
            เปิดใช้งาน (ให้ร้านในหมวดนี้เลือกไปใช้ได้)
          </span>
          <Switch
            name="isActive"
            defaultChecked={editing ? editing.isActive : true}
            disabled={pending}
          />
        </label>
        {state && !state.ok && !state.fieldErrors ? (
          <div
            role="alert"
            className="text-label-md text-error bg-error-container/40 border border-error/30 rounded-lg px-3 py-2"
          >
            {state.message}
          </div>
        ) : null}
      </form>

      <div className="flex gap-3 mt-6">
        <Button
          variant="outline"
          rounded="lg"
          onClick={onClose}
          disabled={pending}
          type="button"
          fullWidth
          className="flex-1"
          iconLeft={<Icon name="close" />}
        >
          ยกเลิก
        </Button>
        <Button
          type="submit"
          form="preset-form"
          variant="primary"
          rounded="lg"
          disabled={pending}
          fullWidth
          className="flex-1"
          iconLeft={
            pending ? (
              <Icon name="progress_activity" className="animate-spin" />
            ) : (
              <Icon name="save" />
            )
          }
        >
          {pending ? "กำลังบันทึก..." : editing ? "อัปเดต" : "เพิ่มบริการ"}
        </Button>
      </div>
    </Modal>
  );
}
