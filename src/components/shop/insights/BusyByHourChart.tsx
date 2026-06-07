import { cn } from "@/lib/cn";
import type { BusyHourBucket } from "@/lib/insights/aggregate";

/**
 * Busy-by-hour bar chart — pure CSS bars (no chart library, per OPP-19's
 * "no new infra" constraint). Each bar's height is its booking count relative
 * to the busiest hour; the peak hour(s) are highlighted.
 *
 * Presentational: receives pre-bucketed data, renders it. The hour axis labels
 * every other hour to stay readable at 375px.
 */
export function BusyByHourChart({ buckets }: { buckets: BusyHourBucket[] }) {
  const max = Math.max(1, ...buckets.map((b) => b.count));

  return (
    <div>
      <div className="flex items-end gap-1 h-40" aria-hidden="true">
        {buckets.map((b) => {
          const pct = b.count === 0 ? 0 : Math.max(6, Math.round((b.count / max) * 100));
          const isPeak = b.count > 0 && b.count === max;
          return (
            <div
              key={b.hour}
              className="relative flex h-full min-w-0 flex-1 items-end"
              title={`${pad(b.hour)}:00 น. · ${b.count} คิว`}
            >
              <div
                className={cn(
                  "w-full rounded-t-md transition-colors",
                  isPeak
                    ? "bg-primary"
                    : b.count > 0
                      ? "bg-primary/35"
                      : "bg-outline-variant/30",
                )}
                style={{ height: b.count === 0 ? "2px" : `${pct}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex gap-1">
        {buckets.map((b, i) => (
          <span
            key={b.hour}
            className="min-w-0 flex-1 text-center text-label-sm tabular-nums text-on-surface-variant"
          >
            {/* Thin the axis: show every other label when crowded (>12 bars). */}
            {buckets.length > 12 && i % 2 === 1 ? "" : b.hour}
          </span>
        ))}
      </div>
    </div>
  );
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}
