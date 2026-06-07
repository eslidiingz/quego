import Link from "next/link";
import { INSIGHTS_RANGES, type InsightsRange } from "@/lib/insights/aggregate";
import { cn } from "@/lib/cn";

/**
 * Pill segmented control for the insights lookback window (7 / 30 / 90 วัน).
 * Server-rendered links that swap the `?range=` param — no client state needed.
 */
export function RangeSelector({ current }: { current: InsightsRange }) {
  return (
    <div
      role="group"
      aria-label="เลือกช่วงเวลา"
      className="inline-flex rounded-full border border-outline-variant bg-surface-container-lowest p-1"
    >
      {INSIGHTS_RANGES.map((r) => {
        const active = r === current;
        return (
          <Link
            key={r}
            href={`/shop/insights?range=${r}`}
            scroll={false}
            aria-pressed={active}
            className={cn(
              "rounded-full px-4 py-1.5 text-label-md transition-colors",
              active
                ? "bg-primary text-on-primary font-bold shadow-sm"
                : "text-on-surface-variant hover:bg-surface-container-high",
            )}
          >
            {r} วัน
          </Link>
        );
      })}
    </div>
  );
}
