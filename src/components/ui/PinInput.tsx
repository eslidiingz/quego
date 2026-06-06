"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { RequiredMark } from "./RequiredMark";

export type PinInputProps = {
  /** Field name — submitted via a hidden input carrying the full PIN. */
  name?: string;
  label?: string;
  required?: boolean;
  /** Number of segment boxes (default 6). */
  maxDigits?: number;
  /** Controlled value. Omit for uncontrolled (FormData) usage. */
  value?: string;
  defaultValue?: string;
  onChange?: (digitsOnly: string) => void;
  errorText?: string;
  disabled?: boolean;
  /** Show digits as plain text instead of masked dots. */
  visible?: boolean;
  autoComplete?: string;
  /** Fires once the value reaches `maxDigits` (e.g. to auto-submit a form). */
  onComplete?: (value: string) => void;
  /** Focus the first box on mount. */
  autoFocus?: boolean;
  id?: string;
  /** Accepted for API compatibility; not rendered in the segmented layout. */
  iconLeft?: React.ReactNode;
  placeholder?: string;
};

function sanitize(raw: string, maxDigits: number): string {
  return raw.replace(/\D+/gu, "").slice(0, maxDigits);
}

/**
 * Segmented numeric PIN entry — one box per digit (OTP style). Composes its
 * own label / required-asterisk / error affordances (mirroring `<Input>`) and
 * submits the combined value through a hidden input so existing FormData-based
 * forms keep working unchanged.
 *
 * Boxes auto-advance on type, walk back on Backspace, accept a full paste, and
 * mask to dots unless `visible`. Digits-only is enforced on every entry path.
 */
export function PinInput({
  name,
  label,
  required,
  maxDigits = 6,
  value: controlled,
  defaultValue,
  onChange,
  errorText,
  disabled,
  visible,
  autoComplete,
  onComplete,
  autoFocus,
  id,
}: PinInputProps) {
  const reactId = React.useId();
  const groupId = id ?? reactId;
  const isControlled = controlled !== undefined;
  const [internal, setInternal] = React.useState(() =>
    sanitize(defaultValue ?? "", maxDigits),
  );
  const current = isControlled ? sanitize(controlled, maxDigits) : internal;
  const invalid = Boolean(errorText);

  const inputsRef = React.useRef<Array<HTMLInputElement | null>>([]);

  const commit = (next: string) => {
    const v = sanitize(next, maxDigits);
    if (!isControlled) setInternal(v);
    onChange?.(v);
    if (v.length === maxDigits) onComplete?.(v);
  };

  const focusBox = (i: number) => {
    const el = inputsRef.current[Math.max(0, Math.min(maxDigits - 1, i))];
    el?.focus();
    el?.select();
  };

  const handleChange = (i: number, raw: string) => {
    const digits = raw.replace(/\D+/gu, "");
    if (!digits) return;
    const arr = current.padEnd(maxDigits).split("");
    let pos = i;
    for (const d of digits) {
      if (pos >= maxDigits) break;
      arr[pos] = d;
      pos += 1;
    }
    commit(arr.join("").trimEnd());
    focusBox(pos);
  };

  const handleKeyDown = (
    i: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const arr = current.split("");
      if (arr[i]) {
        arr[i] = "";
        commit(arr.join(""));
      } else if (i > 0) {
        arr[i - 1] = "";
        commit(arr.join(""));
        focusBox(i - 1);
      }
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      focusBox(i - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      focusBox(i + 1);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = sanitize(e.clipboardData.getData("text"), maxDigits);
    if (!pasted) return;
    commit(pasted);
    focusBox(pasted.length);
  };

  return (
    <div className="flex flex-col gap-2">
      {label ? (
        <label
          htmlFor={`${groupId}-0`}
          className="text-label-md text-on-surface-variant"
        >
          {label}
          {required ? <RequiredMark /> : null}
        </label>
      ) : null}

      {name ? <input type="hidden" name={name} value={current} /> : null}

      <div className="flex gap-2 sm:gap-3" role="group" aria-label={label}>
        {Array.from({ length: maxDigits }).map((_, i) => (
          <input
            key={i}
            id={`${groupId}-${i}`}
            ref={(el) => {
              inputsRef.current[i] = el;
            }}
            type={visible ? "text" : "password"}
            inputMode="numeric"
            autoComplete={i === 0 ? (autoComplete ?? "one-time-code") : "off"}
            autoFocus={i === 0 ? autoFocus : undefined}
            maxLength={1}
            disabled={disabled}
            aria-invalid={invalid || undefined}
            aria-required={required || undefined}
            aria-label={`รหัส PIN หลักที่ ${i + 1}`}
            value={current[i] ?? ""}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            onFocus={(e) => e.currentTarget.select()}
            className={cn(
              "h-14 w-full min-w-0 rounded-lg text-center font-display text-headline-md text-on-surface caret-primary",
              "bg-surface-container-low border-2 border-transparent transition-all duration-200 ease-out",
              "focus:bg-surface-container-lowest focus:border-primary focus:outline-none",
              invalid && "border-error focus:border-error",
              disabled && "opacity-60 cursor-not-allowed",
            )}
          />
        ))}
      </div>

      {errorText ? <p className="text-label-sm text-error">{errorText}</p> : null}
    </div>
  );
}
