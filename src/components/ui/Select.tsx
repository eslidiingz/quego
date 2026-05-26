import * as React from "react";
import { cn } from "@/lib/cn";
import { Icon } from "./Icon";
import { RequiredMark } from "./RequiredMark";

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  helperText?: string;
  errorText?: string;
};

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  function Select(
    { label, helperText, errorText, className, id, children, required, ...rest },
    ref,
  ) {
    const reactId = React.useId();
    const inputId = id ?? reactId;
    const invalid = Boolean(errorText);
    return (
      <div className="flex flex-col gap-2">
        {label ? (
          <label htmlFor={inputId} className="text-label-md text-on-surface-variant">
            {label}
            {required ? <RequiredMark /> : null}
          </label>
        ) : null}
        <div className="relative">
          <select
            id={inputId}
            ref={ref}
            aria-invalid={invalid || undefined}
            aria-required={required || undefined}
            className={cn(
              "w-full h-12 pl-4 pr-12 rounded-lg bg-surface-container-low text-on-surface text-body-md appearance-none transition-all",
              "border-2 border-transparent focus:bg-surface-container-lowest focus:border-secondary focus:outline-none",
              invalid && "border-error focus:border-error",
              className,
            )}
            {...rest}
          >
            {children}
          </select>
          <Icon
            name="expand_more"
            className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant"
          />
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
