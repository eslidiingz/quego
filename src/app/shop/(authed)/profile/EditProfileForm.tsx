"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { LocationSearchPicker } from "@/components/ui/LocationSearchPicker";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { Toast } from "@/components/ui/Toast";
import { Icon } from "@/components/ui/Icon";
import type { CategoryOption, ShopListItem } from "@/lib/services/shops";
import { updateOwnShop, type UpdateOwnShopState } from "./actions";

/**
 * SRP: render the shop's own profile fields + submit to the self-edit action.
 * The owner phone is shown read-only — changing it requires admin assistance.
 */
export function EditProfileForm({
  shop,
  categories,
}: {
  shop: ShopListItem;
  categories: CategoryOption[];
}) {
  const [state, formAction, pending] = useActionState<UpdateOwnShopState, FormData>(
    updateOwnShop,
    null,
  );
  const [toastOpen, setToastOpen] = useState(false);
  // Controlled to constrain input to handle-safe chars as the owner types.
  const [handle, setHandle] = useState(shop.handle ?? "");

  useEffect(() => {
    // Standard "react to server-action settling" pattern. The rule treats
    // setState-in-effect as suspicious, but there's no derived-state
    // alternative when we need a fresh dismissible toast per success.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (state?.ok) setToastOpen(true);
  }, [state]);

  const errors = state && !state.ok ? state.fieldErrors : undefined;
  const cutoffError = state && !state.ok ? state.cutoffError : undefined;
  const submitError = state && !state.ok && !state.fieldErrors ? state.message : null;

  const categoryDefault =
    categories.find((c) => c.name === shop.category_name)?.id ?? "";

  return (
    <>
      {toastOpen ? (
        <Toast
          kind="success"
          message="อัปเดตข้อมูลร้านเรียบร้อย"
          onDismiss={() => setToastOpen(false)}
        />
      ) : null}

      <form action={formAction} className="space-y-8" noValidate>
        <Section
          icon="storefront"
          title="ข้อมูลร้าน"
          description="ข้อมูลที่ลูกค้าจะเห็นบนหน้าค้นหา"
        >
          <Input
            name="name"
            label="ชื่อร้าน"
            required
            defaultValue={shop.name}
            maxLength={120}
            errorText={errors?.name}
            disabled={pending}
          />
          <Input
            name="handle"
            label="ลิงก์ร้าน"
            required
            placeholder="เช่น tukta-salon"
            iconLeft={<Icon name="link" />}
            inputMode="url"
            autoCapitalize="none"
            autoComplete="off"
            maxLength={30}
            value={handle}
            onChange={(e) =>
              setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9-]/gu, ""))
            }
            errorText={errors?.handle}
            helperText={`ที่อยู่ร้าน: quego.app/shops/${handle || "ชื่อร้าน"} · ใช้ a–z, 0–9 และขีด (-)`}
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
        </Section>

        <Section
          icon="badge"
          title="ผู้ติดต่อ"
          description="ข้อมูลที่ทีมงาน Quego ใช้ติดต่อกลับ"
        >
          <Input
            name="ownerName"
            label="ชื่อ-นามสกุล"
            required
            iconLeft={<Icon name="person" />}
            defaultValue={shop.owner_name}
            errorText={errors?.ownerName}
            disabled={pending}
          />
          <Input
            label="เบอร์โทรที่ใช้เข้าสู่ระบบ"
            iconLeft={<Icon name="phone" />}
            value={shop.owner_phone}
            readOnly
            disabled
            helperText="หากต้องการเปลี่ยนเบอร์โทรนี้ ติดต่อทีมงาน Quego"
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
        </Section>

        <Section
          icon="event_repeat"
          title="นโยบายการเลื่อน/ยกเลิกคิว"
          description="กำหนดว่าลูกค้าเลื่อนหรือยกเลิกคิวเองได้ถึงกี่ชั่วโมงก่อนถึงเวลานัด"
        >
          <Input
            name="rescheduleCancelCutoffHours"
            label="ต้องเลื่อน/ยกเลิกล่วงหน้าอย่างน้อย (ชั่วโมง)"
            required
            type="number"
            min={0}
            max={168}
            inputMode="numeric"
            iconLeft={<Icon name="schedule" />}
            defaultValue={String(shop.reschedule_cancel_cutoff_hours ?? 0)}
            errorText={cutoffError}
            helperText="0 = ลูกค้าเลื่อน/ยกเลิกได้จนถึงก่อนเวลานัด • เช่น 24 = ต้องทำก่อนถึงคิวอย่างน้อย 24 ชั่วโมง"
            disabled={pending}
          />
        </Section>

        {submitError ? (
          <div
            role="alert"
            className="text-label-md text-error bg-error-container/40 border border-error/30 rounded-lg px-3 py-2"
          >
            {submitError}
          </div>
        ) : null}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
          <Button
            type="submit"
            size="xl"
            rounded="full"
            disabled={pending}
            iconLeft={
              pending ? (
                <Icon name="progress_activity" className="animate-spin" />
              ) : (
                <Icon name="save" />
              )
            }
          >
            {pending ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง"}
          </Button>
        </div>
      </form>
    </>
  );
}

/**
 * Local visual grouping — same pattern as the public registration form's
 * Section. Promote to a shared component the moment a 3rd consumer needs it.
 */
function Section({
  icon,
  title,
  description,
  children,
}: {
  icon: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm p-6 md:p-8 space-y-4">
      <header className="flex items-start gap-3 pb-4 border-b border-outline-variant/40">
        <span className="w-10 h-10 rounded-lg bg-primary-container/10 text-primary flex items-center justify-center shrink-0">
          <Icon name={icon} />
        </span>
        <div>
          <h2 className="font-display text-headline-md text-on-surface">{title}</h2>
          {description ? (
            <p className="text-label-md text-on-surface-variant mt-1">{description}</p>
          ) : null}
        </div>
      </header>
      <div className="space-y-4 pt-2">{children}</div>
    </section>
  );
}
