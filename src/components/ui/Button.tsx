import * as React from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "destructive";
type Size = "sm" | "md" | "lg" | "xl";

const variants: Record<Variant, string> = {
  primary:
    "bg-primary text-on-primary hover:bg-primary-container active:scale-[0.98] shadow-sm hover:shadow-tinted",
  secondary:
    "bg-surface-container-lowest text-secondary border-2 border-secondary hover:bg-secondary-fixed/40 active:scale-[0.98]",
  outline:
    "bg-transparent text-on-surface border-2 border-outline-variant hover:bg-surface-container-low hover:border-outline active:scale-[0.98]",
  ghost:
    "bg-transparent text-primary hover:bg-surface-container-low active:scale-[0.98]",
  destructive:
    "bg-error text-on-error hover:opacity-90 active:scale-[0.98] shadow-sm",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-label-sm",
  md: "h-11 px-5 text-label-md",
  lg: "h-12 px-6 text-label-md",
  xl: "h-14 px-8 text-body-md font-semibold",
};

type Rounded = "md" | "lg" | "xl" | "full";

/**
 * The button's class composition, factored out so non-`<button>` elements that
 * must look like a button — e.g. an `<a>` that follows a server redirect — can
 * share one source of truth instead of hand-copying the tokens (and drifting).
 */
export function buttonClassName({
  variant = "primary",
  size = "md",
  rounded = "full",
  fullWidth,
  className,
}: {
  variant?: Variant;
  size?: Size;
  rounded?: Rounded;
  fullWidth?: boolean;
  className?: string;
} = {}): string {
  return cn(
    "inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 ease-out disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
    sizes[size],
    variants[variant],
    rounded === "md" && "rounded-md",
    rounded === "lg" && "rounded-lg",
    rounded === "xl" && "rounded-xl",
    rounded === "full" && "rounded-full",
    fullWidth && "w-full",
    className,
  );
}

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  rounded?: Rounded;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  fullWidth?: boolean;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "primary",
      size = "md",
      rounded = "full",
      iconLeft,
      iconRight,
      fullWidth,
      className,
      children,
      ...rest
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        className={buttonClassName({ variant, size, rounded, fullWidth, className })}
        {...rest}
      >
        {iconLeft}
        {children}
        {iconRight}
      </button>
    );
  },
);
