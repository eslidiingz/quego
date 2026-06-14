import { cn } from "@/lib/cn";
import { formatBaht } from "@/lib/baht";
import type { RevenueByStaff } from "@/lib/insights/aggregate";
import { UtilizationBar } from "./UtilizationBar";

/**
 * Ranked staff-revenue rows (revenue desc). Each row: a rank chip (#1 gets a
 * gold accent), the staff name, ฿ revenue on the right, and a utilization bar
 * + booking count underneath. Merges the old standalone utilization list with
 * revenue into one richer ranked view.
 *
 * Presentational: receives pre-sorted, pre-computed rows (DIP). Currency is
 * formatted via the shared `formatBaht`.
 */
export function RevenueByStaffList({ rows }: { rows: RevenueByStaff[] }) {
  // Numbered ranks count only real staff; the "ไม่ระบุพนักงาน" residual bucket
  // (staffId === null) is not a person, so it gets a muted badge with no rank —
  // and it can carry revenue, so we can't assume it sorts last. Computed purely
  // (no render-time mutation): a real staff's rank is how many real staff appear
  // up to and including it.
  return (
    <ul className="space-y-4">
      {rows.map((s, i) => {
        const displayRank =
          s.staffId === null
            ? null
            : rows.slice(0, i + 1).filter((r) => r.staffId !== null).length;
        return (
          <li key={s.staffId ?? "single-queue"} className="space-y-2">
            <div className="flex items-center gap-3">
              <RankBadge rank={displayRank} />
              <span className="min-w-0 flex-1 truncate text-body-md text-on-surface">
                {s.name}
              </span>
              <span className="shrink-0 font-display text-body-md tabular-nums text-on-surface">
                {formatBaht(s.revenue)}
              </span>
            </div>
            <UtilizationBar utilization={s.utilization} />
            <p className="text-label-sm tabular-nums text-on-surface-variant">
              {Math.round(s.utilization * 100)}% · {s.bookingCount} คิว
            </p>
          </li>
        );
      })}
    </ul>
  );
}

/** #1 reads gold (vip), the rest neutral; the residual bucket shows a muted dash. */
function RankBadge({ rank }: { rank: number | null }) {
  return (
    <span
      className={cn(
        "inline-flex size-7 shrink-0 items-center justify-center rounded-full text-label-md font-bold tabular-nums",
        rank === 1
          ? "bg-tertiary-fixed text-on-tertiary-fixed"
          : "bg-surface-container-high text-on-surface-variant",
      )}
      aria-hidden={rank === null || undefined}
    >
      {rank ?? "–"}
    </span>
  );
}
