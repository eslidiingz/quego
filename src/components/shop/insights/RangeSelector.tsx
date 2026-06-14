import Link from "next/link";
import { INSIGHTS_RANGES, type InsightsRange } from "@/lib/insights/aggregate";
import { cn } from "@/lib/cn";

/**
 * Segmented control for the report lookback window. Server-rendered links that
 * swap the `?range=` param — no client state — and PRESERVE any active
 * staff/service filters so changing the date range doesn't silently clear them.
 *
 * Compact + balanced: a single horizontal row of equal-weight pills (active =
 * solid, inactive = outline), scrolling horizontally if it overflows on narrow
 * screens rather than wrapping into an uneven multi-row block.
 */
const RANGE_LABELS: Record<InsightsRange, string> = {
  "7": "7 วัน",
  "30": "30 วัน",
  "90": "90 วัน",
  month: "เดือนนี้",
  lastmonth: "เดือนก่อน",
};

export function RangeSelector({
  current,
  staff = [],
  service = [],
}: {
  current: InsightsRange;
  staff?: string[];
  service?: string[];
}) {
  const href = (r: InsightsRange) => {
    const params = new URLSearchParams({ range: r });
    if (staff.length) params.set("staff", staff.join(","));
    if (service.length) params.set("service", service.join(","));
    return `/shop/insights?${params.toString()}`;
  };

  return (
    <div
      role="group"
      aria-label="เลือกช่วงเวลา"
      className="-mx-0.5 flex w-full gap-1.5 overflow-x-auto px-0.5 py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {INSIGHTS_RANGES.map((r) => {
        const active = r === current;
        return (
          <Link
            key={r}
            href={href(r)}
            scroll={false}
            aria-pressed={active}
            className={cn(
              "shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-label-md font-medium transition-colors",
              active
                ? "border-primary bg-primary text-on-primary"
                : "border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-high",
            )}
          >
            {RANGE_LABELS[r]}
          </Link>
        );
      })}
    </div>
  );
}
