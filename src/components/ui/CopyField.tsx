"use client";

import { useRef, useState } from "react";
import { Button } from "./Button";
import { Icon } from "./Icon";
import { Toast, type ToastKind } from "./Toast";

/**
 * Copy `value` to the clipboard, returning whether it succeeded. Prefers the
 * async Clipboard API, but that only exists in a secure context (HTTPS or
 * localhost) — when a shop opens the page from a phone via the LAN IP (plain
 * http), `navigator.clipboard` is undefined, so we fall back to selecting the
 * field and the legacy `document.execCommand("copy")`.
 */
async function copyToClipboard(
  value: string,
  field: HTMLInputElement | null,
): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // Secure-context API exists but was blocked — fall through to the legacy path.
  }

  if (!field) return false;
  try {
    field.focus();
    field.select();
    field.setSelectionRange(0, value.length);
    const ok = document.execCommand("copy");
    field.setSelectionRange(0, 0);
    field.blur();
    return ok;
  } catch {
    return false;
  }
}

/**
 * A read-only value with a one-tap copy button. Single responsibility: present
 * a string and copy it to the clipboard, always surfacing an explicit
 * success/failure Toast (per the frontend rule that every action shows a
 * result). Reused by any "share this link" surface.
 */
export function CopyField({
  value,
  label,
  id,
}: {
  value: string;
  label?: string;
  /** id ties the optional <label> to the input for a11y. */
  id?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [toast, setToast] = useState<{ kind: ToastKind; message: string } | null>(
    null,
  );

  const handleCopy = async () => {
    if (await copyToClipboard(value, inputRef.current)) {
      setToast({ kind: "success", message: "คัดลอกลิงก์แล้ว" });
    } else {
      setToast({ kind: "error", message: "คัดลอกไม่สำเร็จ ลองอีกครั้ง" });
    }
  };

  return (
    <div>
      {label ? (
        <label
          htmlFor={id}
          className="block text-label-md text-on-surface-variant mb-1.5"
        >
          {label}
        </label>
      ) : null}
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          id={id}
          type="text"
          readOnly
          value={value}
          onFocus={(e) => e.currentTarget.select()}
          className="flex-1 min-w-0 h-11 px-4 rounded-full bg-surface-container-low border border-outline-variant text-body-md text-on-surface truncate focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
        <Button
          type="button"
          variant="secondary"
          onClick={handleCopy}
          iconLeft={<Icon name="content_copy" size={18} />}
          className="shrink-0"
        >
          คัดลอก
        </Button>
      </div>
      {toast ? (
        <Toast
          kind={toast.kind}
          message={toast.message}
          onDismiss={() => setToast(null)}
        />
      ) : null}
    </div>
  );
}
