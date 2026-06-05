import Link from "next/link";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/Icon";

export type PresetCategoryTab = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
};

/**
 * Server-side tabs selecting which category's presets the page shows, via the
 * `?category=<slug>` search param. Stateless — each tab is a link; the page
 * re-reads the param and fetches accordingly. Mirrors the shops `StatusTabs`.
 * SRP: nav only, no business logic.
 */
export function CategoryTabs({
  categories,
  activeSlug,
  counts,
}: {
  categories: PresetCategoryTab[];
  activeSlug: string;
  counts: Record<string, number>;
}) {
  return (
    <nav
      className="flex gap-1 p-1 bg-surface-container-low rounded-full border border-outline-variant overflow-x-auto no-scrollbar"
      aria-label="เลือกหมวดหมู่ร้าน"
    >
      {categories.map((cat) => {
        const isActive = cat.slug === activeSlug;
        const count = counts[cat.id] ?? 0;
        return (
          <Link
            key={cat.id}
            href={`/admin/presets?category=${cat.slug}`}
            scroll={false}
            className={cn(
              "px-4 py-2 rounded-full text-label-md whitespace-nowrap transition-colors flex items-center gap-2",
              isActive
                ? "bg-primary text-on-primary font-bold shadow-sm"
                : "text-on-surface-variant hover:bg-surface-container-high",
            )}
            aria-current={isActive ? "page" : undefined}
          >
            {cat.icon ? <Icon name={cat.icon} size={18} /> : null}
            <span>{cat.name}</span>
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
