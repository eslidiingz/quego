"use client";

import { useState } from "react";
import { PhoneOtpStep } from "@/components/auth/PhoneOtpStep";
import { SetupPinForm } from "./SetupPinForm";

export type CustomerSetupGateProps = {
  /** Canonical Thai phone from the login intent — the number being verified. */
  phone: string;
};

/**
 * Gates first-time PIN setup behind a Firebase phone-OTP step. Signup (first PIN
 * setup) MUST prove phone ownership first; the returning verify path never
 * mounts this. SRP: orchestrate OTP → PIN setup ordering only — all Firebase
 * mechanics stay inside PhoneOtpStep, and the real trust gate is the server
 * cookie it sets (re-checked in `setupCustomerPin`), not this local flag.
 */
export function CustomerSetupGate({ phone }: CustomerSetupGateProps) {
  const [verified, setVerified] = useState(false);

  if (!verified) {
    return (
      <PhoneOtpStep
        phone={phone}
        onVerified={() => setVerified(true)}
        description="ยืนยันเบอร์โทรของคุณก่อนตั้ง PIN"
      />
    );
  }

  return <SetupPinForm />;
}
