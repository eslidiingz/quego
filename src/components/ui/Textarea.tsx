import * as React from "react";
import { cn } from "@/lib/cn";
import { RequiredMark } from "./RequiredMark";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  helperText?: string;
  errorText?: string;
};

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea(
    { label, helperText, errorText, className, id, required, ...rest },
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
        <textarea
          id={inputId}
          ref={ref}
          aria-invalid={invalid || undefined}
          aria-required={required || undefined}
          className={cn(
            "w-full p-4 rounded-lg bg-surface-container-low text-on-surface placeholder:text-outline text-body-md transition-all",
            "border-2 border-transparent focus:bg-surface-container-lowest focus:border-primary focus:outline-none",
            invalid && "border-error focus:border-error",
            className,
          )}
          {...rest}
        />
        {errorText ? (
          <p className="text-label-sm text-error">{errorText}</p>
        ) : helperText ? (
          <p className="text-label-sm text-on-surface-variant">{helperText}</p>
        ) : null}
      </div>
    );
  },
);
