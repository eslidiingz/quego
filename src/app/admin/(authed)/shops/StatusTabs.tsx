import Link from "next/link";
import { cn } from "@/lib/cn";
import type { ShopCountsByStatus, ShopStatus } from "@/lib/services/shops";

type TabKey = ShopStatus | "all";

const tabs: { key: TabKey; label: string }[] = [
  { key: "pending", label: "รออนุมัติ" },
  { key: "approved", label: "อนุมัติแล้ว" },
  { key: "rejected", label: "ปฏิเสธ" },
  { key: "suspended", label: "ระงับ" },
  { key: "all", label: "ทั้งหมด" },
];

/**
 * Server-side tabs that drive the page's filter via a URL search param.
 * Stateless — each tab is just a link; the page re-reads the param and
 * fetches accordingly. SRP: nav only, no business logic.
 */
export function StatusTabs({
  active,
  counts,
}: {
  active: TabKey;
  counts: ShopCountsByStatus;
}) {
  const totalAll =
    counts.pending + counts.approved + counts.rejected + counts.suspended;

  return (
    <nav
      className="flex gap-1 p-1 bg-surface-container-low rounded-full border border-outline-variant overflow-x-auto no-scrollbar"
      aria-label="กรองตามสถานะ"
    >
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        const count = tab.key === "all" ? totalAll : counts[tab.key];
        return (
          <Link
            key={tab.key}
            href={tab.key === "all" ? "/admin/shops" : `/admin/shops?status=${tab.key}`}
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

export type { TabKey };
