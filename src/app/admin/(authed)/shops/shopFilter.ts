import type { ShopListItem } from "@/lib/services/shops";

export const SORT_OPTIONS = [
  { value: "newest", label: "ใหม่สุดก่อน" },
  { value: "oldest", label: "เก่าสุดก่อน" },
  { value: "name", label: "ชื่อร้าน ก-ฮ" },
] as const;

/** The sort union, derived from SORT_OPTIONS so the two can never drift apart. */
export type ShopSort = (typeof SORT_OPTIONS)[number]["value"];

/** Runtime narrow for a raw <select> value to the ShopSort union. */
export function isShopSort(value: string): value is ShopSort {
  return SORT_OPTIONS.some((option) => option.value === value);
}

export type ShopFilterState = {
  /** Free text matched against name / owner name / phone numbers. */
  query: string;
  /** Exact `category_name`, or "" for all categories. */
  category: string;
  /** Exact `province`, or "" for all provinces. */
  province: string;
  sort: ShopSort;
};

/** Keep only digits so "08x-xxx" and "08xxxx" match the same stored number. */
const digitsOnly = (value: string): string => value.replace(/\D/g, "");

function matchesQuery(shop: ShopListItem, rawQuery: string): boolean {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return true;

  if (shop.name.toLowerCase().includes(q)) return true;
  if (shop.owner_name.toLowerCase().includes(q)) return true;

  const qDigits = digitsOnly(rawQuery);
  if (qDigits) {
    if (digitsOnly(shop.owner_phone).includes(qDigits)) return true;
    if (shop.contact_phone && digitsOnly(shop.contact_phone).includes(qDigits)) {
      return true;
    }
  }
  return false;
}

/** Unique, non-null, Thai-collated values — shared by the dropdown builders. */
function distinctSorted(values: readonly (string | null)[]): string[] {
  const seen = new Set<string>();
  for (const value of values) {
    if (value) seen.add(value);
  }
  return [...seen].sort((a, b) => a.localeCompare(b, "th"));
}

/**
 * Distinct provinces / categories present in the given rows — so each filter
 * only ever offers options that actually return results (no zero-result picks).
 */
export function distinctProvinces(rows: ShopListItem[]): string[] {
  return distinctSorted(rows.map((row) => row.province));
}

export function distinctCategories(rows: ShopListItem[]): string[] {
  return distinctSorted(rows.map((row) => row.category_name));
}

/**
 * Pure filter + sort over an already-fetched page of shops. No I/O — the admin
 * page fetches by status server-side, this narrows that set client-side.
 * `created_at` is an ISO-8601 UTC string, so lexicographic compare == chrono.
 */
export function filterAndSortShops(
  rows: ShopListItem[],
  { query, category, province, sort }: ShopFilterState,
): ShopListItem[] {
  const filtered = rows.filter(
    (shop) =>
      matchesQuery(shop, query) &&
      (category === "" || shop.category_name === category) &&
      (province === "" || shop.province === province),
  );

  const sorted = [...filtered];
  switch (sort) {
    case "name":
      sorted.sort((a, b) => a.name.localeCompare(b.name, "th"));
      break;
    case "oldest":
      sorted.sort((a, b) => a.created_at.localeCompare(b.created_at));
      break;
    case "newest":
    default:
      sorted.sort((a, b) => b.created_at.localeCompare(a.created_at));
      break;
  }
  return sorted;
}
