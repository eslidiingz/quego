"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { PinInput } from "@/components/ui/PinInput";
import { Icon } from "@/components/ui/Icon";
import { verifyCustomerPinAction, type PinFormState } from "./actions";

export function VerifyPinForm() {
  const [state, formAction, pending] = useActionState<PinFormState, FormData>(
    verifyCustomerPinAction,
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);
  // Bumped on every failed attempt to remount (and thus clear) the PinInput.
  const [pinKey, setPinKey] = useState(0);

  useEffect(() => {
    // A successful verify redirects, so any non-null state here is a failed
    // attempt: wipe all boxes and send focus back to the first one for a
    // clean retry (remount via a fresh key; autoFocus re-fires on mount).
    if (!state) return;
    /* eslint-disable react-hooks/set-state-in-effect */
    setPinKey((k) => k + 1);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-col gap-4"
      noValidate
    >
      <PinInput
        key={pinKey}
        name="pin"
        label="รหัส PIN"
        required
        maxDigits={6}
        autoComplete="current-password"
        errorText={state?.fieldErrors?.pin}
        disabled={pending}
        autoFocus
        onComplete={() => {
          // Auto-submit once all 6 digits are in. rAF defers one frame so the
          // hidden input has committed the full value before the form
          // serialises it.
          requestAnimationFrame(() => formRef.current?.requestSubmit());
        }}
      />
      {state && !state.fieldErrors ? (
        <div
          role="alert"
          className="text-label-md text-error bg-error-container/40 border border-error/30 rounded-lg px-3 py-2"
        >
          {state.message}
        </div>
      ) : null}
      {pending ? (
        <div className="flex items-center justify-center gap-2 py-2 text-label-md text-on-surface-variant">
          <Icon name="progress_activity" className="animate-spin" />
          กำลังเข้าสู่ระบบ...
        </div>
      ) : null}
    </form>
  );
}
