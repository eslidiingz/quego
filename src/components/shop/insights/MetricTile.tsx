import { cn } from "@/lib/cn";

type Tone = "primary" | "success" | "error" | "secondary";

const TONE: Record<Tone, string> = {
  primary: "text-primary",
  success: "text-success",
  error: "text-error",
  secondary: "text-secondary",
};

/**
 * A single headline metric on the insights dashboard: a label, a large value,
 * and an optional sub-line. Presentational only — all values are pre-formatted
 * by the caller (DIP: no number/currency logic here).
 */
export function MetricTile({
  label,
  value,
  sub,
  tone = "primary",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: Tone;
}) {
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 md:p-5">
      <p className="text-label-md text-on-surface-variant">{label}</p>
      <p className={cn("font-display text-display-sm leading-none mt-2", TONE[tone])}>
        {value}
      </p>
      {sub ? (
        <p className="text-label-sm text-on-surface-variant mt-1.5">{sub}</p>
      ) : null}
    </div>
  );
}
