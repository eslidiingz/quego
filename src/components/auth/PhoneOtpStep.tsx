"use client";

import * as React from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { PinInput } from "@/components/ui/PinInput";
import { usePhoneOtp } from "./usePhoneOtp";

export type PhoneOtpStepProps = {
  /** Canonical Thai phone (10 digits, leading 0) to verify. */
  phone: string;
  /** Fires after the SERVER confirms the OTP and sets the verified cookie. */
  onVerified: () => void;
  /** Optional helper text shown above the control. */
  description?: string;
};

/**
 * Phone-ownership step: sends a Firebase OTP to `phone`, collects the 6-digit
 * code, and reports success via `onVerified`. Presentation only — all Firebase
 * mechanics live in `usePhoneOtp`, and the real trust gate is the server cookie
 * the hook's action sets, not anything in this component.
 */
export function PhoneOtpStep({
  phone,
  onVerified,
  description,
}: PhoneOtpStepProps) {
  const {
    phase,
    error,
    sendCode,
    confirmCode,
    cooldownSeconds,
    resendExhausted,
    containerRef,
  } = usePhoneOtp(phone, onVerified);
  const [code, setCode] = React.useState("");

  const sending = phase === "sending";
  const verifying = phase === "verifying";
  const codeStage = phase === "sent" || phase === "verifying";

  return (
    <div className="flex flex-col gap-4">
      {description ? (
        <p className="text-body-md text-on-surface-variant">{description}</p>
      ) : null}

      <p className="text-body-md text-on-surface">
        ส่งรหัสยืนยันไปที่เบอร์{" "}
        <span className="font-display font-semibold">{phone}</span>
      </p>

      {!codeStage ? (
        <>
          <Button
            type="button"
            fullWidth
            onClick={sendCode}
            disabled={sending}
            iconLeft={
              <Icon
                name={sending ? "progress_activity" : "sms"}
                className={sending ? "animate-spin" : undefined}
              />
            }
          >
            {sending ? "กำลังส่งรหัส..." : "ส่งรหัส OTP"}
          </Button>
          {error ? (
            <p role="alert" className="text-label-sm text-error">
              {error}
            </p>
          ) : null}
        </>
      ) : (
        <div className="flex flex-col gap-4">
          <PinInput
            label="รหัส OTP"
            required
            maxDigits={6}
            value={code}
            onChange={setCode}
            visible
            autoFocus
            autoComplete="one-time-code"
            disabled={verifying}
            errorText={error ?? undefined}
            onComplete={async (v) => {
              // Wrong code → clear the input so the user starts the 6 digits fresh.
              if (!(await confirmCode(v))) setCode("");
            }}
          />
          <div className="flex items-center justify-between gap-3">
            {resendExhausted ? (
              <p className="text-label-sm text-on-surface-variant">
                ขอรหัสครบจำนวนแล้ว กรุณาเริ่มใหม่ภายหลัง
              </p>
            ) : (
              <Button
                type="button"
                variant="ghost"
                onClick={sendCode}
                disabled={sending || verifying || cooldownSeconds > 0}
                className="-ml-5"
              >
                {cooldownSeconds > 0
                  ? `ส่งรหัสอีกครั้ง (${cooldownSeconds} วิ)`
                  : "ส่งรหัสอีกครั้ง"}
              </Button>
            )}
            <Button
              type="button"
              onClick={async () => {
                if (!(await confirmCode(code))) setCode("");
              }}
              disabled={verifying || code.length !== 6}
            >
              {verifying ? "กำลังยืนยัน..." : "ยืนยัน"}
            </Button>
          </div>
        </div>
      )}

      {/* Invisible reCAPTCHA mount point — required by Firebase Phone Auth. */}
      <div ref={containerRef} />
    </div>
  );
}
