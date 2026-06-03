"use client";

import { cloneElement, useState, useTransition } from "react";
import { Button } from "./Button";
import { Modal } from "./Modal";
import { Icon } from "./Icon";

export type ConfirmDialogProps = {
  trigger: React.ReactElement<{ onClick?: () => void; disabled?: boolean }>;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  /** Async work to run when the user confirms. Errors bubble to onError or get logged. */
  onConfirm: () => Promise<void> | void;
  onError?: (error: unknown) => void;
};

/**
 * Single-responsibility confirm-then-act primitive.
 * - SRP: only confirms; doesn't render the trigger UI (caller supplies).
 * - OCP: tone/labels via props; no internal switch on "action type".
 * - DIP: the action is injected via `onConfirm` — no hard-coded server call.
 */
export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = "ยืนยัน",
  cancelLabel = "ยกเลิก",
  destructive,
  onConfirm,
  onError,
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const wrappedTrigger = cloneElement(trigger, {
    onClick: () => setOpen(true),
    disabled: trigger.props?.disabled || pending,
  });

  const handleConfirm = () => {
    startTransition(async () => {
      try {
        await onConfirm();
        setOpen(false);
      } catch (err) {
        if (onError) onError(err);
        else console.error(err);
      }
    });
  };

  return (
    <>
      {wrappedTrigger}
      <Modal
        open={open}
        onClose={pending ? () => undefined : () => setOpen(false)}
        title={title}
        size="sm"
      >
        {description ? (
          <div className="text-body-md text-on-surface-variant">{description}</div>
        ) : null}
        <div className="flex gap-3 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={pending}
            fullWidth
            className="flex-1"
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={destructive ? "destructive" : "primary"}
            onClick={handleConfirm}
            fullWidth
            className="flex-1"
            disabled={pending}
            iconLeft={
              pending ? (
                <Icon name="progress_activity" className="animate-spin" />
              ) : undefined
            }
          >
            {pending ? "กำลังดำเนินการ..." : confirmLabel}
          </Button>
        </div>
      </Modal>
    </>
  );
}
