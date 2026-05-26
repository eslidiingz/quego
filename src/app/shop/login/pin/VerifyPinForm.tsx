"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { PinInput } from "@/components/ui/PinInput";
import { Icon } from "@/components/ui/Icon";
import { verifyShopPinAction, type PinFormState } from "./actions";

export function VerifyPinForm() {
  const [state, formAction, pending] = useActionState<PinFormState, FormData>(
    verifyShopPinAction,
    null,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <PinInput
        name="pin"
        label="รหัส PIN"
        required
        maxDigits={6}
        placeholder="กรอกรหัส PIN 6 หลัก"
        iconLeft={<Icon name="lock" />}
        autoComplete="current-password"
        errorText={state?.fieldErrors?.pin}
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
            <Icon name="login" />
          )
        }
      >
        {pending ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
      </Button>
    </form>
  );
}
