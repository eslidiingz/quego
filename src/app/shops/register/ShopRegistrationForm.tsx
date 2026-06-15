"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { LocationSearchPicker } from "@/components/ui/LocationSearchPicker";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { Modal } from "@/components/ui/Modal";
import { PhoneOtpStep } from "@/components/auth/PhoneOtpStep";
import { Icon } from "@/components/ui/Icon";
import { isValidThaiPhone } from "@/lib/validation/phone";
import { registerShop, type RegisterShopState } from "./actions";
import type { CategoryOption } from "@/lib/services/shops";

export function ShopRegistrationForm({
  categories,
}: {
  categories: CategoryOption[];
}) {
  const [state, formAction, pending] = useActionState<RegisterShopState, FormData>(
    registerShop,
    null,
  );

  const errors = state?.fieldErrors;
  const values = state?.values;

  // OTP gate: the owner phone must be proven via Firebase OTP before the
  // application can be submitted. `phoneVerified` is the UX mirror of the
  // server cookie (the real trust gate lives in the action via isPhoneVerified).
  const [ownerPhone, setOwnerPhone] = useState(values?.ownerPhone ?? "");
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [otpOpen, setOtpOpen] = useState(false);
  // Client-side guard shown when the user tries to submit without verifying;
  // takes precedence over the server-echoed ownerPhone error.
  const [unverifiedError, setUnverifiedError] = useState<string | null>(null);

  const canVerifyPhone = isValidThaiPhone(ownerPhone) && !phoneVerified;

  // On a failed submit, scroll the first invalid field into view and focus it.
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!state) return;
    const form = formRef.current;
    if (!form) return;
    const firstInvalid = form.querySelector<HTMLElement>('[aria-invalid="true"]');
    const target = firstInvalid ?? form.querySelector<HTMLElement>('[role="alert"]');
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    firstInvalid?.focus({ preventScroll: true });
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-8"
      noValidate
      onSubmit={(e) => {
        // Client-side guard only — the server still enforces via isPhoneVerified.
        if (!phoneVerified) {
          e.preventDefault();
          setUnverifiedError(
            "กรุณายืนยันเบอร์โทรด้วย OTP ก่อนสมัคร",
          );
          const field = formRef.current?.querySelector<HTMLElement>(
            '[name="ownerPhone"]',
          );
          field?.scrollIntoView({ behavior: "smooth", block: "center" });
          field?.focus({ preventScroll: true });
        }
      }}
    >
      <Section
        icon="storefront"
        title="ข้อมูลร้าน"
        description="ข้อมูลนี้จะแสดงให้ลูกค้าค้นหาเจอ หลังคุณเพิ่มบริการของร้าน"
      >
        <Input
          name="name"
          label="ชื่อร้าน"
          required
          placeholder="เช่น The Velvet Roast Coffee"
          maxLength={120}
          defaultValue={values?.name ?? ""}
          errorText={errors?.name}
          disabled={pending}
        />
        {/* key=ts forces a remount on every failed submit so defaultValue is
            re-applied even when the same category is submitted twice in a row.
            React 19 does not re-apply <select defaultValue> on re-render (unlike
            <input>), so this is the only compiler-safe way to restore the value. */}
        <Select
          key={state?.ts ?? 0}
          name="categoryId"
          label="ประเภทธุรกิจ"
          required
          errorText={errors?.categoryId}
          disabled={pending}
          defaultValue={values?.categoryId ?? ""}
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
          placeholder="บอกเล่าจุดเด่นและประสบการณ์ที่ลูกค้าจะได้รับ..."
          rows={4}
          defaultValue={values?.description ?? ""}
          errorText={errors?.description}
          disabled={pending}
          maxLength={500}
        />
        <Input
          name="address"
          label="ที่อยู่ร้าน"
          placeholder="ระบุที่อยู่หรือชื่ออาคาร / ห้าง"
          iconLeft={<Icon name="location_on" />}
          defaultValue={values?.address ?? ""}
          errorText={errors?.address}
          disabled={pending}
        />
        <LocationSearchPicker
          required
          defaultProvince={values?.province ?? ""}
          defaultDistrict={values?.district ?? ""}
          defaultSubdistrict={values?.subdistrict ?? ""}
          provinceError={errors?.province}
          districtError={errors?.district}
          subdistrictError={errors?.subdistrict}
          disabled={pending}
        />
        <PhoneInput
          name="contactPhone"
          label="เบอร์โทรร้าน (ถ้ามี)"
          placeholder="0xxxxxxxxx"
          iconLeft={<Icon name="phone" />}
          autoComplete="off"
          defaultValue={values?.contactPhone ?? ""}
          errorText={errors?.contactPhone}
          disabled={pending}
        />
      </Section>

      <Section
        icon="badge"
        title="ผู้ติดต่อ"
        description="เบอร์นี้ใช้สำหรับเข้าสู่ระบบของร้าน และให้เราติดต่อกลับเมื่อจำเป็น"
      >
        <Input
          name="ownerName"
          label="ชื่อ-นามสกุล"
          required
          placeholder="ชื่อจริงของผู้ดำเนินกิจการ"
          iconLeft={<Icon name="person" />}
          autoComplete="name"
          defaultValue={values?.ownerName ?? ""}
          errorText={errors?.ownerName}
          disabled={pending}
        />
        <div className="flex flex-col gap-2">
          <PhoneInput
            name="ownerPhone"
            label="เบอร์โทรผู้ติดต่อ"
            required
            placeholder="0xxxxxxxxx"
            iconLeft={<Icon name="phone" />}
            autoComplete="tel"
            helperText="เบอร์นี้ใช้สำหรับเข้าสู่ระบบร้าน และต้องยืนยันด้วย OTP"
            value={ownerPhone}
            onChange={(next) => {
              setOwnerPhone(next);
              // Any edit to the number invalidates a prior verification, so the
              // user must re-verify the new number before submitting.
              setPhoneVerified(false);
              setUnverifiedError(null);
            }}
            errorText={unverifiedError ?? errors?.ownerPhone}
            disabled={pending}
          />
          {phoneVerified ? (
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-success-container/40 px-3 py-1.5 text-label-md text-success">
              <Icon name="check_circle" />
              ยืนยันเบอร์แล้ว
            </span>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              rounded="full"
              className="w-fit"
              disabled={pending || !canVerifyPhone}
              onClick={() => {
                setUnverifiedError(null);
                setOtpOpen(true);
              }}
              iconLeft={<Icon name="verified_user" />}
            >
              ยืนยันเบอร์
            </Button>
          )}
        </div>
        <Input
          name="ownerEmail"
          label="อีเมล (ไม่บังคับ)"
          placeholder="you@example.com"
          type="email"
          iconLeft={<Icon name="mail" />}
          autoComplete="email"
          defaultValue={values?.ownerEmail ?? ""}
          errorText={errors?.ownerEmail}
          disabled={pending}
        />
      </Section>

      {state && !state.fieldErrors ? (
        <div
          role="alert"
          className="text-label-md text-error bg-error-container/40 border border-error/30 rounded-lg px-3 py-2"
        >
          {state.message}
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
              <Icon name="storefront" />
            )
          }
        >
          {pending ? "กำลังสร้างร้าน..." : "สมัครและเริ่มใช้งานทันที"}
        </Button>
      </div>

      <Modal
        open={otpOpen}
        onClose={() => setOtpOpen(false)}
        title="ยืนยันเบอร์โทร"
        size="sm"
      >
        <PhoneOtpStep
          phone={ownerPhone}
          description="ยืนยันว่าเบอร์นี้เป็นของคุณ"
          onVerified={() => {
            setPhoneVerified(true);
            setUnverifiedError(null);
            setOtpOpen(false);
          }}
        />
      </Modal>
    </form>
  );
}

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
