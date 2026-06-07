"use client";

import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { SORT_OPTIONS, isShopSort, type ShopSort } from "./shopFilter";

/**
 * Stateless filter bar for the admin shops list: search box + category /
 * province / sort selects + a result counter and clear action. Owns no state —
 * every value and handler is injected (DIP), so it stays pure presentation.
 */
export function ShopFilters({
  query,
  category,
  province,
  sort,
  categories,
  provinces,
  resultCount,
  totalCount,
  hasActiveFilters,
  onQueryChange,
  onCategoryChange,
  onProvinceChange,
  onSortChange,
  onClear,
}: {
  query: string;
  category: string;
  province: string;
  sort: ShopSort;
  categories: string[];
  provinces: string[];
  resultCount: number;
  totalCount: number;
  hasActiveFilters: boolean;
  onQueryChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onProvinceChange: (value: string) => void;
  onSortChange: (value: ShopSort) => void;
  onClear: () => void;
}) {
  const controlBorder = "border-outline-variant/70";

  return (
    <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-3 sm:p-4 space-y-2.5">
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto] lg:items-center">
        <Input
          type="text"
          aria-label="ค้นหาร้าน"
          placeholder="ค้นหาชื่อร้าน เจ้าของ หรือเบอร์โทร"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          containerClassName="col-span-2 lg:col-span-1"
          className={controlBorder}
          iconLeft={<Icon name="search" size={20} />}
          iconRight={
            query ? (
              <button
                type="button"
                onClick={() => onQueryChange("")}
                aria-label="ล้างคำค้นหา"
                className="pointer-events-auto flex items-center text-on-surface-variant transition-colors hover:text-on-surface"
              >
                <Icon name="close" size={20} />
              </button>
            ) : undefined
          }
        />

        <div className="col-span-1 lg:w-40">
          <Select
            aria-label="กรองตามหมวดหมู่"
            value={category}
            onChange={(e) => onCategoryChange(e.target.value)}
            className={controlBorder}
          >
            <option value="">ทุกหมวดหมู่</option>
            {categories.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </Select>
        </div>

        <div className="col-span-1 lg:w-40">
          <Select
            aria-label="กรองตามจังหวัด"
            value={province}
            onChange={(e) => onProvinceChange(e.target.value)}
            className={controlBorder}
          >
            <option value="">ทุกจังหวัด</option>
            {provinces.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
        </div>

        <div className="col-span-2 lg:col-span-1 lg:w-44">
          <Select
            aria-label="เรียงลำดับ"
            value={sort}
            onChange={(e) => {
              if (isShopSort(e.target.value)) onSortChange(e.target.value);
            }}
            className={controlBorder}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-outline-variant/60 pt-2.5">
        <p className="text-label-md text-on-surface-variant">
          แสดง{" "}
          <span className="font-bold text-on-surface">{resultCount}</span> จาก{" "}
          {totalCount} ร้าน
        </p>
        {hasActiveFilters ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClear}
            iconLeft={<Icon name="filter_alt_off" size={18} />}
          >
            ล้างตัวกรอง
          </Button>
        ) : null}
      </div>
    </div>
  );
}
