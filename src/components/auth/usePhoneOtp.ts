"use client";

import * as React from "react";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
} from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { toE164Thai } from "@/lib/validation/phone";
import { verifyPhoneOtpAction } from "@/lib/auth/phone-otp-action";

export type OtpPhase = "idle" | "sending" | "sent" | "verifying" | "verified";

/** Seconds the user must wait between OTP sends (cost + flood control). */
const RESEND_COOLDOWN_SECONDS = 60;
/** Hard cap on successful sends per mount — past this, restart the flow. */
const MAX_SENDS = 5;

/**
 * Turn a Firebase Phone-Auth error into a Thai message. User-actionable codes
 * get a specific message; everything else falls back to the generic one — but
 * in development the raw Firebase code is appended so config problems
 * (auth/billing-not-enabled, auth/operation-not-allowed, auth/invalid-app-credential…)
 * are diagnosable instead of hidden behind "ลองใหม่อีกครั้ง". Hidden in prod so
 * end users still see clean copy.
 */
function describeOtpError(err: unknown): string {
  const code =
    typeof err === "object" && err !== null && "code" in err
      ? String((err as { code?: unknown }).code ?? "")
      : "";
  switch (code) {
    case "auth/invalid-phone-number":
      return "เบอร์โทรไม่ถูกต้อง กรุณาตรวจสอบแล้วลองใหม่";
    case "auth/too-many-requests":
      return "มีการขอรหัสบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่";
    case "auth/quota-exceeded":
      return "ระบบส่ง SMS เต็มโควต้าชั่วคราว กรุณาลองใหม่ภายหลัง";
    default: {
      const base = "ส่งรหัส OTP ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
      return process.env.NODE_ENV !== "production" && code
        ? `${base} (${code})`
        : base;
    }
  }
}

export type UsePhoneOtp = {
  phase: OtpPhase;
  error: string | null;
  sendCode: () => Promise<void>;
  /** Resolves true on a verified code, false on any failure (so the caller can reset the input). */
  confirmCode: (code: string) => Promise<boolean>;
  /** Seconds left before another send is allowed (0 = may send now). */
  cooldownSeconds: number;
  /** True once the per-mount send cap is hit — no further sends possible. */
  resendExhausted: boolean;
  /** Attach to an empty <div> — the invisible reCAPTCHA mounts here. */
  containerRef: React.RefObject<HTMLDivElement | null>;
};

/**
 * Encapsulates the Firebase Phone-Auth mechanics (invisible reCAPTCHA → SMS →
 * confirm code → server-verify the ID token) behind a small phase/error API, so
 * the presentation component stays declarative. `onVerified` fires only after
 * the SERVER confirms the token and sets the verified cookie.
 *
 * Owns the resend guardrails too: a per-send cooldown and a per-mount send cap.
 * These are a UX-side cost/flood backstop only — Firebase's own per-phone/IP SMS
 * abuse protection (+ App Check) is the real ceiling, since `sendCode` calls
 * Firebase directly from the browser and never passes through our rate limiter.
 */
export function usePhoneOtp(
  phone: string,
  onVerified: () => void,
): UsePhoneOtp {
  const [phase, setPhase] = React.useState<OtpPhase>("idle");
  const [error, setError] = React.useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = React.useState(0);
  const [sendCount, setSendCount] = React.useState(0);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const verifierRef = React.useRef<RecaptchaVerifier | null>(null);
  const confirmationRef = React.useRef<ConfirmationResult | null>(null);

  const resendExhausted = sendCount >= MAX_SENDS;

  React.useEffect(() => {
    return () => {
      try {
        verifierRef.current?.clear();
      } catch {
        // verifier may already be torn down — ignore
      }
      verifierRef.current = null;
    };
  }, []);

  // Tick the cooldown down once a second while it's active. Keyed on whether
  // it's running (not the value) so the interval is created/torn down once per
  // cooldown, not re-created on every tick.
  const cooling = cooldownSeconds > 0;
  React.useEffect(() => {
    if (!cooling) return;
    const id = setInterval(() => {
      setCooldownSeconds((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [cooling]);

  async function sendCode() {
    setError(null);
    // Guard the resend caps up front — the buttons are already disabled on
    // these, but enforce here too so the hook is the authority, not the UI.
    if (cooldownSeconds > 0) return;
    if (resendExhausted) {
      setError("ขอรหัส OTP เกินจำนวนที่กำหนด กรุณาลองใหม่ภายหลัง");
      return;
    }
    const e164 = toE164Thai(phone);
    if (!e164) {
      setError("เบอร์โทรไม่ถูกต้อง");
      return;
    }
    if (!containerRef.current) {
      setError("ไม่สามารถโหลดตัวยืนยันได้ กรุณารีเฟรชหน้า");
      return;
    }
    setPhase("sending");
    try {
      const auth = getFirebaseAuth();
      if (!verifierRef.current) {
        verifierRef.current = new RecaptchaVerifier(auth, containerRef.current, {
          size: "invisible",
        });
      }
      confirmationRef.current = await signInWithPhoneNumber(
        auth,
        e164,
        verifierRef.current,
      );
      setPhase("sent");
      // Only a SUCCESSFUL send counts against the cap and starts the cooldown —
      // a failed send (below) burns neither, so genuine retries aren't punished.
      setSendCount((c) => c + 1);
      setCooldownSeconds(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      console.error("signInWithPhoneNumber failed:", err);
      try {
        verifierRef.current?.clear();
      } catch {
        // ignore
      }
      verifierRef.current = null;
      setPhase("idle");
      setError(describeOtpError(err));
    }
  }

  async function confirmCode(code: string): Promise<boolean> {
    setError(null);
    if (!confirmationRef.current) {
      setError("กรุณาขอรหัส OTP ก่อน");
      return false;
    }
    if (code.length !== 6) {
      setError("กรอกรหัส OTP ให้ครบ 6 หลัก");
      return false;
    }
    setPhase("verifying");
    try {
      const credential = await confirmationRef.current.confirm(code);
      const idToken = await credential.user.getIdToken();
      const result = await verifyPhoneOtpAction(idToken);
      if (!result.ok) {
        setPhase("sent");
        setError(result.message);
        return false;
      }
      setPhase("verified");
      onVerified();
      return true;
    } catch (err) {
      const code =
        typeof err === "object" && err !== null && "code" in err
          ? String((err as { code?: unknown }).code ?? "")
          : "";
      // A wrong or expired code is normal user input, not a bug — don't log it
      // (Next's dev overlay surfaces every console.error as an "issue"). Only
      // genuinely unexpected failures get logged.
      if (
        code !== "auth/invalid-verification-code" &&
        code !== "auth/code-expired"
      ) {
        console.error("OTP confirm failed:", err);
      }
      setPhase("sent");
      setError(
        code === "auth/code-expired"
          ? "รหัส OTP หมดอายุ กรุณาขอรหัสใหม่"
          : "รหัส OTP ไม่ถูกต้อง กรุณาลองใหม่",
      );
      return false;
    }
  }

  return {
    phase,
    error,
    sendCode,
    confirmCode,
    cooldownSeconds,
    resendExhausted,
    containerRef,
  };
}
