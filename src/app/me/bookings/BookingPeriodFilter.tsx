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
      className="flex gap-1 p-1 bg-surface-container-low rounded-full border border-outline-variant overflow-x-auto no-scrollbar"
      aria-label="กรองตามช่วงเวลา"
    >
      {BOOKING_PERIODS.map((p) => {
        const isActive = p === current;
        return (
          <Link
            key={p}
            href={p === "today" ? "/me/bookings" : `/me/bookings?period=${p}`}
            scroll={false}
            className={cn(
              "px-4 py-2 rounded-full text-label-md whitespace-nowrap transition-colors flex items-center gap-2",
              isActive
                ? "bg-primary text-on-primary font-bold shadow-sm"
                : "text-on-surface-variant hover:bg-surface-container-high",
            )}
            aria-current={isActive ? "page" : undefined}
          >
            <span>{BOOKING_PERIOD_LABELS[p]}</span>
            <span
              className={cn(
                "min-w-6 px-1.5 h-5 inline-flex items-center justify-center rounded-full text-label-sm font-bold",
                isActive
                  ? "bg-on-primary/20 text-on-primary"
                  : "bg-surface-container-high text-on-surface-variant",
              )}
            >
              {counts[p]}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
