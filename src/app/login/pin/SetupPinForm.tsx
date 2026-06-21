"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { PinInput } from "@/components/ui/PinInput";
import { Icon } from "@/components/ui/Icon";
import { setupCustomerPin, type PinFormState } from "./actions";

export function SetupPinForm() {
  const [state, formAction, pending] = useActionState<PinFormState, FormData>(
    setupCustomerPin,
    null,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <PinInput
        name="pin"
        label="รหัส PIN"
        required
        maxDigits={6}
        placeholder="6 หลัก"
        iconLeft={<Icon name="lock" />}
        autoComplete="new-password"
        errorText={state?.fieldErrors?.pin}
        disabled={pending}
        nextFieldId="customer-pin-confirm"
      />
      <PinInput
        id="customer-pin-confirm"
        name="pinConfirm"
        label="ยืนยันรหัส PIN"
        required
        maxDigits={6}
        placeholder="กรอกอีกครั้งให้ตรงกัน"
        iconLeft={<Icon name="lock" />}
        autoComplete="new-password"
        errorText={state?.fieldErrors?.pinConfirm}
        disabled={pending}
      />
      {state && !state.fieldErrors ? (
        <div
          role="alert"
          className="text-label-md text-error bg-error-container/40 border border-error/30 rounded-lg px-3 py-2"
        >
          {state.message}
        </div>
      ) : null}
      <Button
        type="submit"
        size="xl"
        fullWidth
        rounded="lg"
        disabled={pending}
        iconRight={
          pending ? (
            <Icon name="progress_activity" className="animate-spin" />
          ) : (
            <Icon name="lock_open" />
          )
        }
      >
        {pending ? "กำลังตั้งรหัส..." : "ตั้งรหัส PIN และเข้าสู่ระบบ"}
      </Button>
    </form>
  );
}
