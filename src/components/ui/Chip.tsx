import * as React from "react";
import { cn } from "@/lib/cn";

type Variant =
  | "neutral"
  | "waiting"
  | "now-serving"
  | "delayed"
  | "vip"
  | "premium"
  | "confirmed"
  | "success"
  | "danger";

const variants: Record<Variant, string> = {
  neutral: "bg-surface-container-high text-on-surface-variant",
  waiting: "bg-transparent text-primary border border-primary",
  "now-serving": "bg-teal-purple-gradient text-on-primary",
  delayed: "bg-secondary-fixed text-on-secondary-fixed",
  vip: "bg-tertiary-fixed text-on-tertiary-fixed",
  premium: "bg-primary text-on-primary",
  confirmed: "bg-secondary-container text-on-secondary-container",
  success: "bg-success text-on-success",
  danger: "bg-error-container text-on-error-container",
};

export type ChipProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: Variant;
  size?: "sm" | "md";
  pulse?: boolean;
  iconLeft?: React.ReactNode;
};

export function Chip({
  variant = "neutral",
  size = "md",
  pulse,
  iconLeft,
  className,
  children,
  ...rest
}: ChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full whitespace-nowrap font-semibold uppercase tracking-wider",
        size === "sm" ? "px-2.5 py-0.5 text-label-sm" : "px-3 py-1 text-label-sm",
        variants[variant],
        className,
      )}
      {...rest}
    >
      {pulse ? (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-current" />
        </span>
      ) : null}
      {iconLeft}
      {children}
    </span>
  );
}
