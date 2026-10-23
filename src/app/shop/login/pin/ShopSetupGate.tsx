"use client";

import { useState } from "react";
import { PhoneOtpStep } from "@/components/auth/PhoneOtpStep";
import { SetupPinForm } from "./SetupPinForm";

export type ShopSetupGateProps = {
  /** Owner phone from the login intent — the number being verified. */
  phone: string;
  /**
   * True when the server already holds a valid OTP proof for this phone (the
   * owner just registered), so the OTP step is skipped.
   */
  alreadyVerified: boolean;
};

/**
 * Gates first-time shop PIN setup behind a Firebase phone-OTP step, mirroring
 * the customer CustomerSetupGate. SRP: orchestrate OTP → PIN ordering only. The
 * real trust gate is the server cookie re-checked in `setupShopPin`, not this
 * local flag.
 */
export function ShopSetupGate({ phone, alreadyVerified }: ShopSetupGateProps) {
  const [verified, setVerified] = useState(alreadyVerified);

  if (!verified) {
    return (
      <PhoneOtpStep
        phone={phone}
        onVerified={() => setVerified(true)}
        description="ยืนยันเบอร์โทรเจ้าของร้านก่อนตั้ง PIN"
      />
    );
  }

  return <SetupPinForm />;
}
