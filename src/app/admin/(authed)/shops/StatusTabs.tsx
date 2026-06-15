import Link from "next/link";
import { cn } from "@/lib/cn";

/**
 * Tabs for the admin shops list. Registration is self-serve and there is no
 * moderation, so the only meaningful split is "all shops" vs the live
 * (`approved`) set — the latter is the default. Legacy `rejected` tombstones
 * from the old moderation era only surface under "ทั้งหมด".
 */
type TabKey = "all" | "approved";

const tabs: { key: TabKey; label: string }[] = [
  { key: "approved", label: "เปิดให้บริการ" },
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
  counts: { all: number; approved: number };
}) {
  return (
    <nav
      className="flex gap-1 p-1 bg-surface-container-low rounded-full border border-outline-variant overflow-x-auto no-scrollbar"
      aria-label="กรองตามสถานะ"
    >
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        const count = counts[tab.key];
        return (
          <Link
            key={tab.key}
            href={`/admin/shops?status=${tab.key}`}
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
