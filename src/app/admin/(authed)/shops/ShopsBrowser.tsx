"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import type { CategoryOption, ShopListItem } from "@/lib/services/shops";
import { ShopsList } from "./ShopsList";
import { ShopFilters } from "./ShopFilters";
import {
  distinctCategories,
  distinctProvinces,
  filterAndSortShops,
  type ShopSort,
} from "./shopFilter";

/**
 * Container between the server page and the moderation list: owns the
 * client-side filter state and derives the visible rows. The status tab is
 * still server-driven (URL); search / category / province / sort narrow the
 * already-fetched set in place. SRP — filtering only; ShopsList keeps owning
 * the moderation dialogs.
 */
export function ShopsBrowser({
  rows,
  categories,
}: {
  rows: ShopListItem[];
  categories: CategoryOption[];
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [province, setProvince] = useState("");
  const [sort, setSort] = useState<ShopSort>("newest");

  const clear = () => {
    setQuery("");
    setCategory("");
    setProvince("");
    setSort("newest");
  };

  // No shops at all in this status tab → defer to ShopsList's own empty state
  // ("ยังไม่มีร้านในสถานะนี้") and hide the filter bar; there's nothing to filter.
  if (rows.length === 0) {
    return <ShopsList rows={rows} categories={categories} />;
  }

  const provinces = distinctProvinces(rows);
  const categoryNames = distinctCategories(rows);
  const filtered = filterAndSortShops(rows, { query, category, province, sort });
  const hasActiveFilters =
    query.trim() !== "" ||
    category !== "" ||
    province !== "" ||
    sort !== "newest";

  return (
    <div className="space-y-4">
      <ShopFilters
        query={query}
        category={category}
        province={province}
        sort={sort}
        categories={categoryNames}
        provinces={provinces}
        resultCount={filtered.length}
        totalCount={rows.length}
        hasActiveFilters={hasActiveFilters}
        onQueryChange={setQuery}
        onCategoryChange={setCategory}
        onProvinceChange={setProvince}
        onSortChange={setSort}
        onClear={clear}
      />

      {filtered.length > 0 ? (
        <ShopsList rows={filtered} categories={categories} />
      ) : (
        <NoMatchState onClear={clear} />
      )}
    </div>
  );
}

/** Empty state when filters exclude every row (distinct from "no shops here"). */
function NoMatchState({ onClear }: { onClear: () => void }) {
  return (
    <div className="bg-surface-container-lowest border border-dashed border-outline-variant rounded-xl p-12 text-center">
      <div className="w-16 h-16 mx-auto rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant mb-4">
        <Icon name="search_off" size={32} />
      </div>
      <p className="text-body-md text-on-surface">ไม่พบร้านที่ตรงกับการค้นหา</p>
      <p className="text-label-md text-on-surface-variant mt-1">
        ลองปรับคำค้นหาหรือตัวกรอง แล้วลองใหม่อีกครั้ง
      </p>
      <div className="mt-4 flex justify-center">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onClear}
          iconLeft={<Icon name="filter_alt_off" size={18} />}
        >
          ล้างตัวกรอง
        </Button>
      </div>
    </div>
  );
}
