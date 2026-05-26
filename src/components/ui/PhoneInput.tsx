"use client";

import * as React from "react";
import { Input, type InputProps } from "./Input";

export type PhoneInputProps = Omit<
  InputProps,
  "type" | "inputMode" | "onChange" | "value" | "defaultValue"
> & {
  defaultValue?: string;
  value?: string;
  onChange?: (digitsOnly: string) => void;
  /** Logical digit cap (default 10 for TH mobile). */
  maxDigits?: number;
};

function sanitize(raw: string, maxDigits: number): string {
  return raw.replace(/\D+/gu, "").slice(0, maxDigits);
}

/**
 * Phone field that accepts digits only — non-digits are stripped on input
 * (paste included). Keeps `name` on the underlying input so plain
 * `<form>`/server-action submission picks the value up.
 */
export function PhoneInput({
  defaultValue,
  value: controlled,
  onChange,
  maxDigits = 10,
  maxLength,
  autoComplete,
  ...rest
}: PhoneInputProps) {
  const [internal, setInternal] = React.useState(() =>
    sanitize(defaultValue ?? "", maxDigits),
  );
  const isControlled = controlled !== undefined;
  const current = isControlled ? sanitize(controlled, maxDigits) : internal;

  return (
    <Input
      {...rest}
      type="tel"
      inputMode="numeric"
      autoComplete={autoComplete ?? "tel"}
      value={current}
      onChange={(e) => {
        const next = sanitize(e.target.value, maxDigits);
        if (!isControlled) setInternal(next);
        onChange?.(next);
      }}
      // `maxLength` here is only a defense backup — paste is already sanitized
      // in the change handler. Generous cap avoids browser truncating raw input
      // BEFORE the handler runs (which would silently lose digits).
      maxLength={maxLength ?? maxDigits * 3}
    />
  );
}
