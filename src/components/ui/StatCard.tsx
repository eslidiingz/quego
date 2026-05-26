import { cn } from "@/lib/cn";
import { Icon } from "./Icon";

export type StatCardProps = {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  iconTint?: "primary" | "secondary" | "tertiary";
  trend?: { value: string; direction: "up" | "down"; tone?: "primary" | "secondary" };
  className?: string;
};

const iconTints = {
  primary: "bg-primary-container/10 text-primary",
  secondary: "bg-secondary-container/30 text-secondary",
  tertiary: "bg-tertiary-container/20 text-tertiary",
};

export function StatCard({
  label,
  value,
  icon,
  iconTint = "primary",
  trend,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between min-h-[140px]",
        className,
      )}
    >
      <div className="flex justify-between items-start">
        {icon ? (
          <span className={cn("p-2 rounded-lg", iconTints[iconTint])}>{icon}</span>
        ) : <span />}
        {trend ? (
          <span
            className={cn(
              "text-xs font-bold flex items-center gap-1",
              trend.tone === "secondary" ? "text-secondary" : "text-primary",
            )}
          >
            {trend.value}
            <Icon
              name={trend.direction === "up" ? "arrow_upward" : "arrow_downward"}
              size={14}
            />
          </span>
        ) : null}
      </div>
      <div>
        <p className="text-display-lg-mobile font-bold text-on-background mt-3 leading-tight">
          {value}
        </p>
        <p className="text-label-md text-on-surface-variant mt-1">{label}</p>
      </div>
    </div>
  );
}
