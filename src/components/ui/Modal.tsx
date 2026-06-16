"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import { Icon } from "./Icon";

export type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizes = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-2xl",
};

/**
 * Portal-rendered modal. We render into <body> to escape ancestor stacking
 * contexts — in particular, any `transform` on an ancestor (e.g. a sidebar
 * using `translate-x-*` for slide animation) would otherwise become the
 * containing block for `position: fixed`, trapping the modal inside it.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = "md",
  className,
}: ModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // SSR portal guard: flip on first client mount so `document` is defined.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="quego-overlay-in fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/40 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={cn(
          "quego-pop-in w-full bg-surface-container-lowest rounded-2xl shadow-luxury border border-outline-variant flex flex-col max-h-[90vh]",
          sizes[size],
          className,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-outline-variant">
          <h2 id="modal-title" className="font-display text-headline-md text-on-surface">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิด"
            className="inline-flex items-center justify-center size-10 rounded-full text-on-surface-variant hover:bg-surface-container-low transition-colors duration-200 ease-out"
          >
            <Icon name="close" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">{children}</div>
        {footer ? (
          <div className="flex gap-3 p-6 border-t border-outline-variant bg-surface-container-low/50 [&>*]:flex-1">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
