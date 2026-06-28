import Link from "next/link";
import {
  BOOKING_PERIODS,
  BOOKING_PERIOD_LABELS,
  type BookingPeriod,
} from "@/lib/booking/period";
import { cn } from "@/lib/cn";

/**
 * Pill tabs for the "คิวของฉัน" time filter (วันนี้ / สัปดาห์นี้ / เดือนนี้ /
 * ทั้งหมด). Server-rendered links that swap the `?period=` param — no client
 * state needed. Styling is kept identical to the shop's BookingsTabs so the
 * two booking lists read as one product. Each tab shows how many bookings fall
 * in that period.
 */
export function BookingPeriodFilter({
  current,
  counts,
}: {
  current: BookingPeriod;
  counts: Record<BookingPeriod, number>;
}) {
  return (
    <nav
      className="grid grid-cols-4 gap-1 p-1 bg-surface-container-low rounded-full border border-outline-variant"
      aria-label="กรองตามช่วงเวลา"
    >
      {BOOKING_PERIODS.map((p) => {
        const isActive = p === current;
        const count = counts[p];
        return (
          <Link
            key={p}
            href={p === "today" ? "/me/bookings" : `/me/bookings?period=${p}`}
            scroll={false}
            className={cn(
              "px-2 py-2 rounded-full text-label-sm sm:text-label-md whitespace-nowrap transition-colors flex items-center justify-center gap-1.5",
              isActive
                ? "bg-primary text-on-primary font-bold shadow-sm"
                : "text-on-surface-variant hover:bg-surface-container-high",
            )}
            aria-current={isActive ? "page" : undefined}
          >
            <span>{BOOKING_PERIOD_LABELS[p]}</span>
            {/* Hide the count badge when zero — an empty period adds noise and
                steals width from the Thai labels in the 4-up grid. */}
            {count > 0 ? (
              <span
                className={cn(
                  "min-w-5 px-1 h-5 inline-flex items-center justify-center rounded-full text-label-sm font-bold",
                  isActive
                    ? "bg-on-primary/20 text-on-primary"
                    : "bg-surface-container-high text-on-surface-variant",
                )}
              >
                {count}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
