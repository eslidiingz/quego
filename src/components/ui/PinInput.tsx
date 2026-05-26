"use client";

import * as React from "react";
import { Input, type InputProps } from "./Input";

export type PinInputProps = Omit<
  InputProps,
  "type" | "inputMode" | "onChange" | "value" | "defaultValue" | "maxLength"
> & {
  defaultValue?: string;
  value?: string;
  onChange?: (digitsOnly: string) => void;
  /** Logical digit cap (default 6 for a numeric PIN). */
  maxDigits?: number;
  /** Show digits as plain text (e.g. for confirm-PIN visualisation). */
  visible?: boolean;
};

function sanitize(raw: string, maxDigits: number): string {
  return raw.replace(/\D+/gu, "").slice(0, maxDigits);
}

/**
 * Numeric-only, masked input for PIN entry. Composes `<Input>` so all the
 * label / iconLeft / errorText / required-asterisk affordances come along
 * for free.
 *
 * Like `<PhoneInput>`, sanitization happens in the change handler — `type`
 * is `password` (default) so the digits are masked while the user types,
 * and `inputMode="numeric"` brings up the numeric keypad on mobile.
 */
export function PinInput({
  defaultValue,
  value: controlled,
  onChange,
  maxDigits = 6,
  visible,
  autoComplete,
  ...rest
}: PinInputProps) {
  const [internal, setInternal] = React.useState(() =>
    sanitize(defaultValue ?? "", maxDigits),
  );
  const isControlled = controlled !== undefined;
  const current = isControlled ? sanitize(controlled, maxDigits) : internal;

  return (
    <Input
      {...rest}
      type={visible ? "text" : "password"}
      inputMode="numeric"
      autoComplete={autoComplete ?? "one-time-code"}
      value={current}
      onChange={(e) => {
        const next = sanitize(e.target.value, maxDigits);
        if (!isControlled) setInternal(next);
        onChange?.(next);
      }}
      // Generous defense backup; paste is already sanitized in the handler.
      maxLength={maxDigits * 3}
    />
  );
}
