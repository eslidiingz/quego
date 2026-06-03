"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Toast } from "@/components/ui/Toast";
import { Icon } from "@/components/ui/Icon";
import { FormSection } from "@/components/ui/FormSection";
import { updateCustomerProfile, type UpdateNameState } from "./actions";

/**
 * SRP: edit the customer's display name. Phone is shown read-only — it's the
 * identity key linking bookings, so it isn't editable here.
 */
export function ProfileNameForm({
  name,
  phone,
}: {
  name: string | null;
  phone: string;
}) {
  const [state, formAction, pending] = useActionState<UpdateNameState, FormData>(
    updateCustomerProfile,
    null,
  );
  const [toastOpen, setToastOpen] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (state?.ok) setToastOpen(true);
  }, [state]);

  const fieldError = state && !state.ok ? state.fieldErrors?.name : undefined;
  const submitError =
    state && !state.ok && !state.fieldErrors ? state.message : null;

  return (
    <>
      {toastOpen ? (
        <Toast
          kind="success"
          message="บันทึกโปรไฟล์เรียบร้อย"
          onDismiss={() => setToastOpen(false)}
        />
      ) : null}

      <form action={formAction} className="space-y-4" noValidate>
        <FormSection icon="person" title="ข้อมูลส่วนตัว">
          <Input
            name="name"
            label="ชื่อที่แสดง"
            placeholder="ชื่อจริงหรือชื่อเล่น"
            iconLeft={<Icon name="person" />}
            defaultValue={name ?? ""}
            maxLength={100}
            errorText={fieldError}
            disabled={pending}
            helperText="ใช้แสดงตอนจองคิวกับร้าน"
          />
          <Input
            label="เบอร์โทร"
            iconLeft={<Icon name="phone" />}
            value={phone}
            readOnly
            disabled
            helperText="เบอร์โทรเป็นรหัสประจำบัญชี ไม่สามารถเปลี่ยนได้"
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
                <Icon name="save" />
              )
            }
          >
            {pending ? "กำลังบันทึก..." : "บันทึกชื่อ"}
          </Button>
        </div>
      </form>
    </>
  );
}
