import Link from "next/link";
import { cn } from "@/lib/cn";
import type { BookingsCounts, BookingsFilter } from "@/lib/services/bookings";

const tabs: { key: BookingsFilter; label: string }[] = [
  { key: "today", label: "วันนี้" },
  { key: "upcoming", label: "ที่กำลังจะถึง" },
  { key: "past", label: "ผ่านมาแล้ว" },
  { key: "all", label: "ทั้งหมด" },
];

export function BookingsTabs({
  active,
  counts,
}: {
  active: BookingsFilter;
  counts: BookingsCounts;
}) {
  return (
    <nav
      className="flex gap-1 p-1 bg-surface-container-low rounded-full border border-outline-variant overflow-x-auto no-scrollbar"
      aria-label="กรองรายการจอง"
    >
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        const count = counts[tab.key];
        return (
          <Link
            key={tab.key}
            href={tab.key === "today" ? "/shop/bookings" : `/shop/bookings?view=${tab.key}`}
            scroll={false}
            className={cn(
              "px-4 py-2 rounded-full text-label-md whitespace-nowrap transition-colors flex items-center gap-2",
              isActive
                ? "bg-primary text-on-primary font-bold shadow-sm"
                : "text-on-surface-variant hover:bg-surface-container-high",
            )}
            aria-current={isActive ? "page" : undefined}
          >
            <span>{tab.label}</span>
            <span
              className={cn(
                "min-w-6 px-1.5 h-5 inline-flex items-center justify-center rounded-full text-label-sm font-bold",
                isActive
                  ? "bg-on-primary/20 text-on-primary"
                  : "bg-surface-container-high text-on-surface-variant",
              )}
            >
              {count}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
