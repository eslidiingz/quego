"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { Icon } from "@/components/ui/Icon";
import { startCustomerLogin, type StartCustomerLoginState } from "./actions";

export function CustomerLoginForm() {
  const [state, formAction, pending] = useActionState<
    StartCustomerLoginState,
    FormData
  >(startCustomerLogin, null);

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <PhoneInput
        name="phone"
        label="เบอร์โทรศัพท์ของคุณ"
        required
        placeholder="0xxxxxxxxx"
        iconLeft={<Icon name="phone" />}
        autoComplete="username"
        errorText={state?.fieldErrors?.phone}
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
            <Icon name="arrow_forward" />
          )
        }
      >
        {pending ? "กำลังตรวจสอบ..." : "เข้าสู่ระบบ"}
      </Button>
    </form>
  );
}
