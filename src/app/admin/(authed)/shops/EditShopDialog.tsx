"use client";

import { useActionState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { LocationSearchPicker } from "@/components/ui/LocationSearchPicker";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { Modal } from "@/components/ui/Modal";
import { Icon } from "@/components/ui/Icon";
import type { CategoryOption, ShopListItem } from "@/lib/services/shops";
import { updateShop, type UpdateShopState } from "./actions";

/**
 * Admin-only modal to edit a shop's profile. Uses the same field validator
 * as the public registration form (shared in src/lib/validation/shop.ts) so
 * the server-side rules stay consistent.
 *
 * SRP: collects + submits profile fields only. The shop's `status` is not
 * editable — registration is self-serve and there is no moderation flow.
 */
export function EditShopDialog({
  open,
  onClose,
  shop,
  categories,
  onResult,
}: {
  open: boolean;
  onClose: () => void;
  shop: ShopListItem;
  categories: CategoryOption[];
  onResult: (ok: boolean, message: string) => void;
}) {
  const boundAction = updateShop.bind(null, shop.id);
  const [state, formAction, pending] = useActionState<UpdateShopState, FormData>(
    boundAction,
    null,
  );

  // Close + toast on a successful submit.
  useEffect(() => {
    if (state?.ok) {
      onResult(true, "อัปเดตข้อมูลร้านเรียบร้อย");
      onClose();
    }
  }, [state, onResult, onClose]);

  const errors = state && !state.ok ? state.fieldErrors : undefined;
  const submitError = state && !state.ok && !state.fieldErrors ? state.message : null;

  // Map the shop's category_name back to its id for the Select defaultValue.
  // If the category is gone (deactivated/deleted), fall back to "" so the
  // admin sees the placeholder and must pick a valid one.
  const categoryDefault =
    categories.find((c) => c.name === shop.category_name)?.id ?? "";

  const formId = `edit-shop-${shop.id}`;

  return (
    <Modal
      open={open}
      onClose={pending ? () => undefined : onClose}
      title={`แก้ไขข้อมูลร้าน: ${shop.name}`}
      size="lg"
    >
      <form id={formId} action={formAction} className="space-y-4" noValidate>
        <Input
          name="name"
          label="ชื่อร้าน"
          required
          defaultValue={shop.name}
          maxLength={120}
          errorText={errors?.name}
          disabled={pending}
        />
        <Select
          name="categoryId"
          label="ประเภทธุรกิจ"
          required
          defaultValue={categoryDefault}
          errorText={errors?.categoryId}
          disabled={pending}
        >
          <option value="" disabled>
            เลือกประเภทธุรกิจ
          </option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Textarea
          name="description"
          label="คำอธิบายสั้นๆ"
          rows={3}
          defaultValue={shop.description ?? ""}
          errorText={errors?.description}
          disabled={pending}
          maxLength={500}
        />
        <Input
          name="address"
          label="ที่อยู่ร้าน"
          iconLeft={<Icon name="location_on" />}
          defaultValue={shop.address ?? ""}
          errorText={errors?.address}
          disabled={pending}
        />
        <LocationSearchPicker
          required
          defaultProvince={shop.province ?? ""}
          defaultDistrict={shop.district ?? ""}
          defaultSubdistrict={shop.subdistrict ?? ""}
          provinceError={errors?.province}
          districtError={errors?.district}
          subdistrictError={errors?.subdistrict}
          disabled={pending}
        />
        <PhoneInput
          name="contactPhone"
          label="เบอร์โทรร้าน"
          iconLeft={<Icon name="phone" />}
          defaultValue={shop.contact_phone ?? ""}
          errorText={errors?.contactPhone}
          disabled={pending}
        />

        <div className="pt-2 mt-2 border-t border-outline-variant/40">
          <p className="text-label-sm uppercase tracking-widest text-on-surface-variant mb-3">
            ผู้ติดต่อ
          </p>
        </div>

        <Input
          name="ownerName"
          label="ชื่อผู้ติดต่อ"
          required
          iconLeft={<Icon name="person" />}
          defaultValue={shop.owner_name}
          errorText={errors?.ownerName}
          disabled={pending}
        />
        <PhoneInput
          name="ownerPhone"
          label="เบอร์โทรผู้ติดต่อ"
          required
          iconLeft={<Icon name="phone" />}
          defaultValue={shop.owner_phone}
          errorText={errors?.ownerPhone}
          disabled={pending}
        />
        <Input
          name="ownerEmail"
          label="อีเมล"
          type="email"
          iconLeft={<Icon name="mail" />}
          defaultValue={shop.owner_email ?? ""}
          errorText={errors?.ownerEmail}
          disabled={pending}
        />

        {submitError ? (
          <div
            role="alert"
            className="text-label-md text-error bg-error-container/40 border border-error/30 rounded-lg px-3 py-2"
          >
            {submitError}
          </div>
        ) : null}
      </form>

      <div className="flex gap-3 mt-6">
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
          form={formId}
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
          {pending ? "กำลังบันทึก..." : "บันทึก"}
        </Button>
      </div>
    </Modal>
  );
}
