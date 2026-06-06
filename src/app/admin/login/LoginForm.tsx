"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { Icon } from "@/components/ui/Icon";
import { signInAdmin, type SignInState } from "./actions";

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState<SignInState, FormData>(
    signInAdmin,
    null,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <PhoneInput
        name="phone"
        label="เบอร์โทรศัพท์"
        required
        placeholder="0812345678"
        iconLeft={<Icon name="phone" />}
        autoComplete="username"
        maxDigits={10}
        errorText={state?.fieldErrors?.phone}
        disabled={pending}
      />
      <Input
        name="password"
        label="รหัสผ่าน"
        required
        placeholder="รหัสผ่านของคุณ"
        iconLeft={<Icon name="lock" />}
        type="password"
        autoComplete="current-password"
        errorText={state?.fieldErrors?.password}
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
        rounded="full"
        disabled={pending}
        iconRight={pending ? <Icon name="progress_activity" className="animate-spin" /> : <Icon name="login" />}
      >
        {pending ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
      </Button>
    </form>
  );
}
