import * as React from "react";
import { cn } from "@/lib/cn";
import { RequiredMark } from "./RequiredMark";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  helperText?: React.ReactNode;
  errorText?: string;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  containerClassName?: string;
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  function Input(
    {
      label,
      helperText,
      errorText,
      iconLeft,
      iconRight,
      className,
      containerClassName,
      id,
      // `required` is intercepted: it drives the red asterisk + aria-required,
      // but is NOT forwarded to the native input — we never want HTML's
      // native validation popover (Rule 2 / Rule 8).
      required,
      ...rest
    },
    ref,
  ) {
    const reactId = React.useId();
    const inputId = id ?? reactId;
    const invalid = Boolean(errorText);
    return (
      <div className={cn("flex flex-col gap-2", containerClassName)}>
        {label ? (
          <label
            htmlFor={inputId}
            className="text-label-md text-on-surface-variant"
          >
            {label}
            {required ? <RequiredMark /> : null}
          </label>
        ) : null}
        <div className="relative flex items-center">
          {iconLeft ? (
            <span className="pointer-events-none absolute left-4 flex items-center text-on-surface-variant">
              {iconLeft}
            </span>
          ) : null}
          <input
            id={inputId}
            ref={ref}
            aria-invalid={invalid || undefined}
            aria-required={required || undefined}
            className={cn(
              // No resting border (per design): the field reads as an input via
              // a *raised* fill instead. surface-container-high sits lighter than
              // the card's bg-surface (esp. in dark mode), so the field lifts off
              // the card; hover/focus lift it one more step. The border line only
              // appears on focus (primary) / error.
              "w-full h-12 rounded-lg bg-surface-container-high text-on-surface placeholder:text-outline text-body-md transition-all duration-200 ease-out",
              "border-2 border-transparent hover:bg-surface-container-highest focus:bg-surface-container-highest focus:border-primary focus:outline-none",
              iconLeft ? "pl-12 pr-4" : "px-4",
              iconRight ? "pr-12" : undefined,
              invalid && "border-error focus:border-error",
              className,
            )}
            {...rest}
          />
          {iconRight ? (
            <span className="pointer-events-none absolute right-4 flex items-center text-on-surface-variant">
              {iconRight}
            </span>
          ) : null}
        </div>
        {errorText ? (
          <p className="text-label-sm text-error">{errorText}</p>
        ) : helperText ? (
          <p className="text-label-sm text-on-surface-variant">{helperText}</p>
        ) : null}
      </div>
    );
  },
);
