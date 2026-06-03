"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import { Icon } from "./Icon";

export type ToastKind = "success" | "error" | "info";

export type ToastProps = {
  kind?: ToastKind;
  message: string;
  /** Auto-dismiss timeout in ms; 0 disables auto-dismiss. */
  duration?: number;
  /** Notify caller when the toast finishes hiding (so they can clear URL state). */
  onDismiss?: () => void;
};

const styles: Record<ToastKind, { container: string; icon: string }> = {
  success: {
    container: "bg-success text-on-success border-success",
    icon: "check_circle",
  },
  error: {
    container: "bg-error text-on-error border-error",
    icon: "error",
  },
  info: {
    container: "bg-inverse-surface text-inverse-on-surface border-outline",
    icon: "info",
  },
};

/**
 * Floating top-center toast. Single responsibility: render a transient
 * message. The trigger lives elsewhere — pass `message` from URL state,
 * server flash, or a parent's state.
 */
export function Toast({ kind = "info", message, duration = 4000, onDismiss }: ToastProps) {
  const [visible, setVisible] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // SSR portal guard: flip on first client mount so `document` is defined.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!duration) return;
    const t = window.setTimeout(() => setVisible(false), duration);
    return () => window.clearTimeout(t);
  }, [duration]);

  useEffect(() => {
    if (visible) return;
    const t = window.setTimeout(() => onDismiss?.(), 200);
    return () => window.clearTimeout(t);
  }, [visible, onDismiss]);

  if (!mounted) return null;

  const style = styles[kind];

  return createPortal(
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "fixed top-6 inset-x-0 mx-auto w-max max-w-[calc(100%-2rem)] z-[60] flex items-center gap-2 px-4 py-3 rounded-full border shadow-luxury text-label-md transition-all duration-200",
        style.container,
        visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none",
      )}
    >
      <Icon name={style.icon} />
      <span>{message}</span>
      <button
        type="button"
        onClick={() => setVisible(false)}
        aria-label="ปิด"
        className="ml-2 opacity-80 hover:opacity-100"
      >
        <Icon name="close" size={18} />
      </button>
    </div>,
    document.body,
  );
}
