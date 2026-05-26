"use client";

import { useActionState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { Modal } from "@/components/ui/Modal";
import { Icon } from "@/components/ui/Icon";
import {
  createCategory,
  updateCategory,
  type CategoryFormState,
} from "./actions";

export type CategoryEditing = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
} | null;

export function CategoryFormDialog({
  open,
  onClose,
  editing,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  editing: CategoryEditing;
  onSuccess: (message: string) => void;
}) {
  const action = editing
    ? updateCategory.bind(null, editing.id)
    : createCategory;
  const [state, formAction, pending] = useActionState<
    CategoryFormState,
    FormData
  >(action, null);

  useEffect(() => {
    if (state?.ok) {
      onSuccess(state.message ?? "บันทึกเรียบร้อย");
      onClose();
    }
  }, [state, onSuccess, onClose]);

  const title = editing ? "แก้ไขหมวดหมู่" : "เพิ่มหมวดหมู่ใหม่";

  return (
    <Modal
      open={open}
      onClose={pending ? () => undefined : onClose}
      title={title}
      size="lg"
    >
      <form id="category-form" action={formAction} className="space-y-4" noValidate>
        <Input
          name="name"
          label="ชื่อหมวดหมู่"
          required
          defaultValue={editing?.name ?? ""}
          placeholder="เช่น ร้านอาหาร, สปา, คลินิก"
          errorText={state && !state.ok ? state.fieldErrors?.name : undefined}
          disabled={pending}
          maxLength={64}
        />
        <Input
          name="slug"
          label="Slug (URL-friendly)"
          defaultValue={editing?.slug ?? ""}
          placeholder="restaurant, spa, clinic"
          helperText="เว้นว่างจะสร้างอัตโนมัติจากชื่อ"
          errorText={state && !state.ok ? state.fieldErrors?.slug : undefined}
          disabled={pending}
          maxLength={64}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            name="icon"
            label="ชื่อไอคอน (Material Symbols)"
            defaultValue={editing?.icon ?? ""}
            placeholder="restaurant, spa, content_cut"
            helperText="ดูชื่อได้ที่ fonts.google.com/icons"
            errorText={state && !state.ok ? state.fieldErrors?.icon : undefined}
            disabled={pending}
          />
          <Input
            name="sort_order"
            label="ลำดับการแสดงผล"
            type="number"
            defaultValue={String(editing?.sort_order ?? 0)}
            errorText={state && !state.ok ? state.fieldErrors?.sort_order : undefined}
            disabled={pending}
          />
        </div>
        <div className="pt-2">
          <Switch
            name="is_active"
            defaultChecked={editing ? editing.is_active : true}
            label="เปิดใช้งาน (แสดงให้ลูกค้าเห็น)"
            disabled={pending}
          />
        </div>
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
        >
          ยกเลิก
        </Button>
        <Button
          type="submit"
          form="category-form"
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
          {pending ? "กำลังบันทึก..." : editing ? "อัปเดต" : "เพิ่มหมวดหมู่"}
        </Button>
      </div>
    </Modal>
  );
}
