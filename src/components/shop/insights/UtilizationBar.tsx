import { cn } from "@/lib/cn";

/**
 * A single horizontal utilization bar — booked-minutes share of capacity,
 * 0–1. Colour shifts by level so dead time (low fill) reads at a glance.
 * Extracted from the staff list so the staff-revenue rows and any future
 * surface share one bar + one tone scale (DIP: callers depend on this shape,
 * not on a re-implementation).
 *
 * Presentational: receives a pre-computed 0–1 ratio, renders a track + fill.
 */
export function UtilizationBar({ utilization }: { utilization: number }) {
  const pct = Math.round(utilization * 100);
  return (
    <div className="h-2.5 overflow-hidden rounded-full bg-surface-container-high">
      <div
        className={cn("h-full rounded-full transition-all", barTone(pct))}
        style={{ width: `${Math.max(pct, pct > 0 ? 2 : 0)}%` }}
      />
    </div>
  );
}

/** Busy lines read green, moderate primary (teal), quiet lines amber-ish. */
export function barTone(pct: number): string {
  if (pct >= 70) return "bg-success";
  if (pct >= 40) return "bg-primary";
  return "bg-secondary";
}
