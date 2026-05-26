import * as React from "react";
import { cn } from "@/lib/cn";

export type SwitchProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type"
> & {
  label?: string;
};

export const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  function Switch({ label, className, id, ...rest }, ref) {
    const reactId = React.useId();
    const inputId = id ?? reactId;
    return (
      <label
        htmlFor={inputId}
        className="relative inline-flex items-center gap-3 cursor-pointer select-none"
      >
        <input
          id={inputId}
          ref={ref}
          type="checkbox"
          className="sr-only peer"
          {...rest}
        />
        <span
          className={cn(
            "w-11 h-6 bg-outline-variant rounded-full transition-colors peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-secondary peer-focus-visible:ring-offset-2",
            "after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-5 after:h-5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:after:translate-x-5",
            className,
          )}
        />
        {label ? <span className="text-label-md text-on-surface">{label}</span> : null}
      </label>
    );
  },
);
