import { cn } from "@/lib/cn";

export type ProgressBarProps = {
  value: number;
  max?: number;
  variant?: "primary" | "gradient" | "gold" | "luxury";
  size?: "sm" | "md" | "lg";
  label?: string;
  showValue?: boolean;
  className?: string;
};

const trackSizes = {
  sm: "h-1",
  md: "h-2",
  lg: "h-3",
};

const fills = {
  primary: "bg-primary",
  gradient: "bg-progress-gradient",
  gold: "bg-secondary",
  luxury: "bg-luxury-gradient",
};

export function ProgressBar({
  value,
  max = 100,
  variant = "primary",
  size = "md",
  label,
  showValue,
  className,
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className={cn("w-full", className)}>
      {(label || showValue) && (
        <div className="flex justify-between items-end mb-2">
          {label ? (
            <span className="text-label-sm text-on-surface-variant">{label}</span>
          ) : <span />}
          {showValue ? (
            <span className="text-label-md text-primary font-bold">{Math.round(pct)}%</span>
          ) : null}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        className={cn(
          "w-full rounded-full overflow-hidden bg-surface-container-high",
          trackSizes[size],
        )}
      >
        <div
          className={cn("h-full rounded-full transition-all duration-700", fills[variant])}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
