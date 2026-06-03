"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/Icon";
import {
  PublicShopCard,
  type ShopOpenState,
} from "@/components/booking/PublicShopCard";

export type DiscoveryShop = {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  service_duration_minutes: number;
  openState: ShopOpenState;
};

export type DiscoveryGroup = {
  category: { id: string; name: string; icon: string | null };
  shops: DiscoveryShop[];
};

/**
 * Client-side discovery surface for the customer home: free-text search over
 * shop name / description / address, plus category filter chips. Pure
 * presentation + local UI state — it receives the already-assembled groups as
 * a prop (DIP: the server route owns the Supabase read).
 *
 * SRP: filtering + layout of the shop list. It does not fetch, and the leaf
 * `PublicShopCard` owns a single card's rendering.
 */
export function ShopDiscovery({ groups }: { groups: DiscoveryGroup[] }) {
  const [query, setQuery] = useState("");
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);

  const totalShops = useMemo(
    () => groups.reduce((sum, g) => sum + g.shops.length, 0),
    [groups],
  );

  const normalizedQuery = query.trim().toLowerCase();

  const filteredGroups = useMemo(() => {
    return groups
      .filter((g) => !activeCategoryId || g.category.id === activeCategoryId)
      .map((g) => ({
        ...g,
        shops: normalizedQuery
          ? g.shops.filter((s) => matchesQuery(s, normalizedQuery))
          : g.shops,
      }))
      .filter((g) => g.shops.length > 0);
  }, [groups, activeCategoryId, normalizedQuery]);

  const resultCount = filteredGroups.reduce((sum, g) => sum + g.shops.length, 0);

  return (
    <div className="flex flex-col">
      {/* Search */}
      <div className="max-w-xl mx-auto w-full px-4 md:px-12">
        <SearchField
          value={query}
          onChange={setQuery}
          onClear={() => setQuery("")}
        />
      </div>

      {/* Category filter chips */}
      <div className="mt-stack-md">
        <div className="max-w-[1280px] mx-auto w-full">
          <div className="flex gap-2 overflow-x-auto px-4 md:px-12 pb-1 no-scrollbar">
            <FilterChip
              label="ทั้งหมด"
              icon="apps"
              count={totalShops}
              active={activeCategoryId === null}
              onClick={() => setActiveCategoryId(null)}
            />
            {groups.map((g) => (
              <FilterChip
                key={g.category.id}
                label={g.category.name}
                icon={g.category.icon ?? "category"}
                count={g.shops.length}
                active={activeCategoryId === g.category.id}
                onClick={() => setActiveCategoryId(g.category.id)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-[1280px] mx-auto w-full px-4 md:px-12 py-stack-lg space-y-stack-lg">
        {resultCount === 0 ? (
          <NoResults query={query} />
        ) : (
          filteredGroups.map(({ category, shops }) => (
            <CategorySection key={category.id} category={category} shops={shops} />
          ))
        )}
      </div>
    </div>
  );
}

function matchesQuery(shop: DiscoveryShop, q: string): boolean {
  return (
    shop.name.toLowerCase().includes(q) ||
    (shop.description?.toLowerCase().includes(q) ?? false) ||
    (shop.address?.toLowerCase().includes(q) ?? false)
  );
}

function SearchField({
  value,
  onChange,
  onClear,
}: {
  value: string;
  onChange: (next: string) => void;
  onClear: () => void;
}) {
  return (
    <div className="relative">
      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">
        <Icon name="search" size={22} />
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="ค้นหาร้านที่ต้องการ…"
        aria-label="ค้นหาร้าน"
        className="w-full h-12 sm:h-14 pl-12 pr-11 rounded-full bg-surface-container-lowest border border-outline-variant shadow-sm text-body-md text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
      />
      {value ? (
        <button
          type="button"
          onClick={onClear}
          aria-label="ล้างการค้นหา"
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-on-surface-variant hover:bg-surface-container-high transition-colors"
        >
          <Icon name="close" size={18} />
        </button>
      ) : null}
    </div>
  );
}

function FilterChip({
  label,
  icon,
  count,
  active,
  onClick,
}: {
  label: string;
  icon: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "shrink-0 inline-flex items-center gap-1.5 h-10 px-4 rounded-full border text-label-md font-semibold transition-colors active:scale-95",
        active
          ? "bg-primary text-on-primary border-primary"
          : "bg-surface-container-lowest text-on-surface-variant border-outline-variant hover:border-primary hover:text-primary",
      )}
    >
      <Icon name={icon} size={18} />
      {label}
      <span
        className={cn(
          "text-[11px] font-bold tabular-nums",
          active ? "text-on-primary/80" : "text-on-surface-variant/70",
        )}
      >
        {count}
      </span>
    </button>
  );
}

function CategorySection({
  category,
  shops,
}: {
  category: { id: string; name: string; icon: string | null };
  shops: DiscoveryShop[];
}) {
  return (
    <section aria-labelledby={`cat-${category.id}`}>
      <header className="flex items-center gap-3 mb-4">
        <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15 flex items-center justify-center shrink-0">
          <Icon name={category.icon ?? "category"} />
        </span>
        <h2
          id={`cat-${category.id}`}
          className="font-display text-headline-md text-on-background"
        >
          {category.name}
        </h2>
        <span className="text-label-md text-on-surface-variant">
          ({shops.length} ร้าน)
        </span>
      </header>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
        {shops.map((shop) => (
          <PublicShopCard
            key={shop.id}
            id={shop.id}
            name={shop.name}
            description={shop.description}
            address={shop.address}
            serviceDurationMinutes={shop.service_duration_minutes}
            categoryIcon={category.icon}
            openState={shop.openState}
          />
        ))}
      </div>
    </section>
  );
}

function NoResults({ query }: { query: string }) {
  return (
    <div className="bg-surface-container-lowest border border-dashed border-outline-variant rounded-xl p-12 text-center max-w-2xl mx-auto">
      <div className="w-16 h-16 mx-auto rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant mb-4">
        <Icon name="search_off" size={32} />
      </div>
      <p className="text-body-md text-on-surface">
        ไม่พบร้านที่ตรงกับ “{query.trim()}”
      </p>
      <p className="text-label-md text-on-surface-variant mt-1">
        ลองค้นด้วยคำอื่น หรือเลือกหมวดหมู่ด้านบน
      </p>
    </div>
  );
}
