"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "./Button";
import { PinInput } from "./PinInput";
import { Toast } from "./Toast";
import { Icon } from "./Icon";
import { FormSection } from "./FormSection";

export type ChangePinFieldErrors = {
  currentPin?: string;
  newPin?: string;
  confirmPin?: string;
};

export type ChangePinState =
  | { ok: true }
  | { ok: false; message: string; fieldErrors?: ChangePinFieldErrors }
  | null;

export type ChangePinAction = (
  prev: ChangePinState,
  formData: FormData,
) => Promise<ChangePinState>;

/**
 * Shared "change PIN" form (current → new → confirm). Persona-agnostic: the
 * actual change is injected via the `action` prop (DIP), so the customer and
 * shop areas reuse this with their own session-scoped server action.
 *
 * SRP: collect + submit three PINs and surface field errors. Verification of
 * the current PIN and the write happen entirely in the injected action /
 * service layer.
 *
 * Reset strategy: each PIN field carries its own remount key so we can clear
 * fields independently. On a failed attempt only the field(s) that errored
 * are wiped (e.g. wrong current PIN clears just that box; a confirm mismatch
 * clears just the confirm box) — what the user typed correctly stays put.
 * Success clears all three for the next change.
 */
export function ChangePinForm({
  action,
  title = "เปลี่ยนรหัส PIN",
  description = "กรอก PIN เดิมเพื่อยืนยันตัวตน แล้วตั้ง PIN ใหม่",
}: {
  action: ChangePinAction;
  title?: string;
  description?: string;
}) {
  const [state, formAction, pending] = useActionState<ChangePinState, FormData>(
    action,
    null,
  );
  const [toastOpen, setToastOpen] = useState(false);
  // Per-field remount counters — bump one to clear just that field.
  const [resetKeys, setResetKeys] = useState({
    currentPin: 0,
    newPin: 0,
    confirmPin: 0,
  });

  useEffect(() => {
    if (!state) return;
    /* eslint-disable react-hooks/set-state-in-effect */
    if (state.ok) {
      // Success: toast + clear everything for the next change.
      setToastOpen(true);
      setResetKeys((k) => ({
        currentPin: k.currentPin + 1,
        newPin: k.newPin + 1,
        confirmPin: k.confirmPin + 1,
      }));
    } else {
      // Failure: clear ONLY the fields that errored; keep the rest so the
      // user only re-enters what was actually wrong.
      const fe = state.fieldErrors ?? {};
      setResetKeys((k) => ({
        currentPin: fe.currentPin ? k.currentPin + 1 : k.currentPin,
        newPin: fe.newPin ? k.newPin + 1 : k.newPin,
        confirmPin: fe.confirmPin ? k.confirmPin + 1 : k.confirmPin,
      }));
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [state]);

  const errors = state && !state.ok ? state.fieldErrors : undefined;
  const submitError =
    state && !state.ok && !state.fieldErrors ? state.message : null;
  // Focus the first field that errored so the user lands on what to re-type.
  const focusField = errors
    ? errors.currentPin
      ? "currentPin"
      : errors.newPin
        ? "newPin"
        : errors.confirmPin
          ? "confirmPin"
          : null
    : null;

  return (
    <>
      {toastOpen ? (
        <Toast
          kind="success"
          message="เปลี่ยนรหัส PIN เรียบร้อย"
          onDismiss={() => setToastOpen(false)}
        />
      ) : null}

      <form action={formAction} className="space-y-4" noValidate>
        <FormSection icon="lock_reset" title={title} description={description}>
          <PinInput
            key={`currentPin-${resetKeys.currentPin}`}
            name="currentPin"
            label="รหัส PIN เดิม"
            required
            maxDigits={6}
            autoComplete="current-password"
            errorText={errors?.currentPin}
            disabled={pending}
            autoFocus={focusField === "currentPin"}
            nextFieldId="change-new-pin"
          />
          <PinInput
            key={`newPin-${resetKeys.newPin}`}
            id="change-new-pin"
            name="newPin"
            label="รหัส PIN ใหม่"
            required
            maxDigits={6}
            autoComplete="new-password"
            errorText={errors?.newPin}
            disabled={pending}
            autoFocus={focusField === "newPin"}
            nextFieldId="change-confirm-pin"
          />
          <PinInput
            key={`confirmPin-${resetKeys.confirmPin}`}
            id="change-confirm-pin"
            name="confirmPin"
            label="ยืนยันรหัส PIN ใหม่"
            required
            maxDigits={6}
            autoComplete="new-password"
            errorText={errors?.confirmPin}
            disabled={pending}
            autoFocus={focusField === "confirmPin"}
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
            {pending ? "กำลังเปลี่ยน..." : "เปลี่ยนรหัส PIN"}
          </Button>
        </div>
      </form>
    </>
  );
}
