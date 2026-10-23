"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Icon } from "@/components/ui/Icon";
import { FormSection } from "@/components/ui/FormSection";
import { PASSWORD_MIN_LENGTH } from "@/lib/validation/password";
import { changeAdminPasswordAction, type ChangePasswordState } from "./actions";

/**
 * Current → new → confirm password form for the signed-in admin. Validation
 * runs only on submit, in the server action; field errors come back through
 * `useActionState`. Success redirects with `?notice=password-changed`, which
 * remounts this form empty and shows the FlashToast.
 */
export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState<
    ChangePasswordState,
    FormData
  >(changeAdminPasswordAction, null);

  const errors = state?.fieldErrors;
  const submitError = state && !state.fieldErrors ? state.message : null;

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <FormSection
        icon="lock_reset"
        title="เปลี่ยนรหัสผ่าน"
        description="กรอกรหัสผ่านปัจจุบันเพื่อยืนยันตัวตน แล้วตั้งรหัสผ่านใหม่"
      >
        <Input
          name="currentPassword"
          label="รหัสผ่านปัจจุบัน"
          required
          type="password"
          autoComplete="current-password"
          iconLeft={<Icon name="lock" />}
          errorText={errors?.currentPassword}
          disabled={pending}
        />
        <Input
          name="newPassword"
          label="รหัสผ่านใหม่"
          required
          type="password"
          autoComplete="new-password"
          iconLeft={<Icon name="key" />}
          helperText={`อย่างน้อย ${PASSWORD_MIN_LENGTH} ตัวอักษร และต้องไม่ซ้ำกับรหัสผ่านปัจจุบัน`}
          errorText={errors?.newPassword}
          disabled={pending}
        />
        <Input
          name="confirmPassword"
          label="ยืนยันรหัสผ่านใหม่"
          required
          type="password"
          autoComplete="new-password"
          iconLeft={<Icon name="key" />}
          errorText={errors?.confirmPassword}
          disabled={pending}
        />
      </FormSection>

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
              <Icon name="lock_reset" />
            )
          }
        >
          {pending ? "กำลังเปลี่ยน..." : "เปลี่ยนรหัสผ่าน"}
        </Button>
      </div>
    </form>
  );
}
