import { cn } from "@/lib/cn";
import type { StaffUtilization } from "@/lib/insights/aggregate";

/**
 * Per-staff utilization bars: each staff line's booked minutes as a percentage
 * of the shop's open minutes over the window. Higher = busier. Colour shifts by
 * level so dead time (low fill) reads at a glance.
 *
 * Presentational: receives pre-computed, pre-sorted utilization rows.
 */
export function StaffUtilizationList({ staff }: { staff: StaffUtilization[] }) {
  return (
    <ul className="space-y-3.5">
      {staff.map((s) => {
        const pct = Math.round(s.utilization * 100);
        return (
          <li key={s.staffId ?? "single-queue"} className="space-y-1.5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-body-md text-on-surface truncate">{s.name}</span>
              <span className="shrink-0 text-label-md tabular-nums text-on-surface-variant">
                {pct}%
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-surface-container-high">
              <div
                className={cn("h-full rounded-full transition-all", barTone(pct))}
                style={{ width: `${Math.max(pct, pct > 0 ? 2 : 0)}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** Busy lines read green, moderate primary, quiet lines amber-ish secondary. */
function barTone(pct: number): string {
  if (pct >= 70) return "bg-success";
  if (pct >= 40) return "bg-primary";
  return "bg-secondary";
}
