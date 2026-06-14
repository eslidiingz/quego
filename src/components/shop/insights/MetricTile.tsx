import type * as React from "react";
import { cn } from "@/lib/cn";

type Tone = "primary" | "success" | "error" | "secondary";

const TONE: Record<Tone, string> = {
  primary: "text-primary",
  success: "text-success",
  error: "text-error",
  secondary: "text-secondary",
};

/**
 * A single headline metric on the report dashboard: a label, a large value, an
 * optional sub-line, and an optional `delta` slot (e.g. a ▲/▼ chip). Presentational
 * only — all values are pre-formatted by the caller (DIP: no number/currency
 * logic here). The delta is a slot, not a flag, so callers compose any indicator.
 */
export function MetricTile({
  label,
  value,
  sub,
  tone = "primary",
  delta,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: Tone;
  delta?: React.ReactNode;
}) {
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 md:p-5">
      <p className="text-label-md text-on-surface-variant">{label}</p>
      <p className={cn("font-display text-display-sm leading-none mt-2", TONE[tone])}>
        {value}
      </p>
      {delta ? <div className="mt-2">{delta}</div> : null}
      {sub ? (
        <p className="text-label-sm text-on-surface-variant mt-1.5">{sub}</p>
      ) : null}
    </div>
  );
}
