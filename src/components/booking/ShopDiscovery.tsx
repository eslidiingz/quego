"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/Icon";
import { locationLabel, type LocationValue } from "@/components/ui/LocationCombobox";
import {
  PublicShopCard,
  type ShopOpenState,
} from "@/components/booking/PublicShopCard";
import { shopImageUrl } from "@/lib/r2/url";
import type { ShopRatingSummary } from "@/lib/services/reviews";
import { distanceKm, type LatLng } from "@/lib/location/maps";

export type DiscoveryService = { name: string; price: number | null };

export type DiscoveryShop = {
  id: string;
  /** Pretty URL handle for the card link. */
  handle: string | null;
  name: string;
  description: string | null;
  address: string | null;
  province: string | null;
  district: string | null;
  subdistrict: string | null;
  /** Map pin (WGS84) for "ใกล้ฉัน" distance; null when the shop set no pin. */
  latitude: number | null;
  longitude: number | null;
  /** Active services — searchable + shown as chips on the card. */
  services: DiscoveryService[];
  openState: ShopOpenState;
  /** Average rating + count for the card badge. */
  rating: ShopRatingSummary;
  /** R2 object key for the shop logo; null → category-icon fallback on the card. */
  logo_key: string | null;
  /** R2 object key for the shop cover; null → gradient-banner fallback on the card. */
  cover_key: string | null;
};

export type DiscoveryGroup = {
  category: { id: string; name: string; icon: string | null };
  shops: DiscoveryShop[];
};

type GridItem = {
  shop: DiscoveryShop;
  categoryIcon: string | null;
  /** Distance from the customer (km) once "ใกล้ฉัน" is on and the shop has a pin. */
  distanceKm?: number | null;
};

/**
 * Customer discovery surface for the home page. The *search* (location +
 * free-text) lives in the landing hero and seeds this section through the URL
 * (`?q` / `?province` / `?cat`); here we only own the live **category chips**
 * + the results grid, so there's a single search box on the page rather than a
 * duplicate one. Selecting a chip filters client-side with no reload.
 *
 * SRP: filter + lay out the shop list. It does not fetch — the server route
 * owns the Supabase read (DIP) and remounts this via a `key` when the URL seed
 * changes, keeping local chip state honest without a prop→state effect.
 */
export function ShopDiscovery({
  groups,
  initialQuery = "",
  initialCategoryId = "",
  initialProvince = "",
  initialDistrict = "",
  initialSubdistrict = "",
}: {
  groups: DiscoveryGroup[];
  /** Free-text seed from the hero search (?q=). */
  initialQuery?: string;
  /** Category seed from a hero category pill (?cat=). */
  initialCategoryId?: string;
  /** Location seed from the hero search (?province=/?district=/?subdistrict=). */
  initialProvince?: string;
  initialDistrict?: string;
  initialSubdistrict?: string;
}) {
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(
    initialCategoryId || null,
  );

  // Customer location powers the per-card distance badge. We ask for it on load
  // (see the effect below) so every card can show "X กม." without a tap; the
  // "ใกล้ฉัน" button is now only a *sort* toggle (nearest-first), independent of
  // whether the badge is shown.
  const [userLoc, setUserLoc] = useState<LatLng | null>(null);
  const [geoBusy, setGeoBusy] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [sortByDistance, setSortByDistance] = useState(false);

  // Ask for location once on mount so distances appear without an extra tap.
  // We skip the prompt only when the browser reports the permission as already
  // "denied" (don't nag a customer who blocked us); a silent auto-load failure
  // never shows the error banner — only an explicit button tap does.
  useEffect(() => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) return;
    let cancelled = false;
    const fetchLoc = () => {
      setGeoBusy(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (cancelled) return;
          setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setGeoBusy(false);
        },
        () => {
          if (cancelled) return;
          setGeoBusy(false);
        },
        { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
      );
    };
    if (navigator.permissions?.query) {
      navigator.permissions
        .query({ name: "geolocation" as PermissionName })
        .then((status) => {
          if (cancelled) return;
          if (status.state !== "denied") fetchLoc();
        })
        .catch(() => {
          if (!cancelled) fetchLoc();
        });
    } else {
      fetchLoc();
    }
    return () => {
      cancelled = true;
    };
  }, []);

  // Explicit "ใกล้ฉัน" tap: if we already have the location, just toggle the
  // nearest-first sort; otherwise (re)request it — a tap is a clear opt-in, so a
  // failure here *does* surface the error banner — and switch sorting on once it
  // arrives.
  function toggleNearMe() {
    if (sortByDistance) {
      setSortByDistance(false);
      return;
    }
    if (userLoc) {
      setSortByDistance(true);
      return;
    }
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setGeoError("อุปกรณ์นี้ไม่รองรับการหาตำแหน่ง");
      return;
    }
    setGeoBusy(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setSortByDistance(true);
        setGeoBusy(false);
      },
      () => {
        setGeoError("หาตำแหน่งไม่สำเร็จ หรือไม่ได้รับอนุญาต");
        setGeoBusy(false);
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  }

  const location: LocationValue | null = initialProvince
    ? {
        province: initialProvince,
        district: initialDistrict || null,
        subdistrict: initialSubdistrict || null,
      }
    : null;
  const normalizedQuery = initialQuery.trim().toLowerCase();
  const hasSearch = Boolean(normalizedQuery || location);

  // Location + free-text narrow the dataset; category chips refine it live.
  const filteredGroups = useMemo(
    () =>
      groups.map((g) => ({
        category: g.category,
        shops: g.shops.filter(
          (s) =>
            matchesLocation(s, location) && matchesQuery(s, normalizedQuery),
        ),
      })),
    [groups, location, normalizedQuery],
  );

  const totalCount = filteredGroups.reduce((n, g) => n + g.shops.length, 0);

  // Only categories that still have shops get a chip — no dead chips.
  const chipGroups = filteredGroups.filter((g) => g.shops.length > 0);

  // If the active category has no shops under the current search, fall back to
  // "ทั้งหมด" so the grid never looks empty while another category has results.
  const effectiveCategoryId =
    activeCategoryId &&
    chipGroups.some((g) => g.category.id === activeCategoryId)
      ? activeCategoryId
      : null;

  const items = useMemo<GridItem[]>(() => {
    const chosen = effectiveCategoryId
      ? filteredGroups.filter((g) => g.category.id === effectiveCategoryId)
      : filteredGroups;
    const flat = chosen.flatMap((g) =>
      g.shops.map((shop) => ({ shop, categoryIcon: g.category.icon })),
    );
    // Open shops first (stable sort keeps the server's newest-first order within
    // each open/closed bucket).
    return flat.sort((a, b) => openRank(a.shop.openState) - openRank(b.shop.openState));
  }, [filteredGroups, effectiveCategoryId]);

  // Once we have the customer's location, annotate every card with its distance
  // (so the "X กม." badge shows without any tap). Only re-sort nearest-first when
  // "ใกล้ฉัน" is toggled on; shops without a pin keep no distance and, when
  // sorting, sink to the bottom.
  const displayItems = useMemo<GridItem[]>(() => {
    if (!userLoc) return items;
    const withDistance = items.map((it) => {
      const { latitude, longitude } = it.shop;
      const d =
        latitude != null && longitude != null
          ? distanceKm(userLoc, { lat: latitude, lng: longitude })
          : null;
      return { ...it, distanceKm: d };
    });
    if (!sortByDistance) return withDistance;
    return withDistance.sort((a, b) => {
      if (a.distanceKm == null && b.distanceKm == null) return 0;
      if (a.distanceKm == null) return 1;
      if (b.distanceKm == null) return -1;
      return a.distanceKm - b.distanceKm;
    });
  }, [items, userLoc, sortByDistance]);

  return (
    <div className="flex flex-col gap-stack-md px-4 md:px-12">
      {hasSearch ? (
        <ActiveFilters
          query={initialQuery}
          location={location}
          resultCount={totalCount}
        />
      ) : null}

      {/* Category filter chips */}
      <div className="max-w-[1180px] mx-auto w-full">
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          <FilterChip
            label="ทั้งหมด"
            icon="apps"
            count={totalCount}
            active={effectiveCategoryId === null}
            onClick={() => setActiveCategoryId(null)}
          />
          {chipGroups.map((g) => (
            <FilterChip
              key={g.category.id}
              label={g.category.name}
              icon={g.category.icon ?? "category"}
              count={g.shops.length}
              active={effectiveCategoryId === g.category.id}
              onClick={() => setActiveCategoryId(g.category.id)}
            />
          ))}
        </div>
      </div>

      {/* "ใกล้ฉัน" control — left-aligned above the grid. */}
      {items.length > 0 ? (
        <div className="max-w-[1180px] mx-auto w-full flex items-center justify-start gap-2">
          <NearMeButton
            active={sortByDistance}
            busy={geoBusy}
            onClick={toggleNearMe}
          />
          {geoError ? (
            <span role="alert" className="text-label-sm text-error">
              {geoError}
            </span>
          ) : null}
        </div>
      ) : null}

      {/* Results grid */}
      <div className="max-w-[1180px] mx-auto w-full pb-stack-md">
        {displayItems.length === 0 ? (
          <NoResults query={initialQuery} location={location} />
        ) : (
          <div
            key={effectiveCategoryId ?? "all"}
            className="quego-fade-in grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6"
          >
            {displayItems.map(({ shop, categoryIcon, distanceKm: d }) => (
              <PublicShopCard
                key={shop.id}
                id={shop.id}
                handle={shop.handle}
                name={shop.name}
                categoryIcon={categoryIcon}
                logoUrl={shopImageUrl(shop.logo_key)}
                coverUrl={shopImageUrl(shop.cover_key)}
                province={shop.province}
                district={shop.district}
                services={shop.services}
                openState={shop.openState}
                rating={shop.rating}
                distanceKm={d}
              />
            ))}
            {/* Fill a sparse last row so the grid never looks hollow — and turn
               the empty space into an owner-conversion nudge. Shown when the
               result set is small or doesn't fill the 3-up desktop row. */}
            {displayItems.length < 3 || displayItems.length % 3 !== 0 ? (
              <OpenShopCtaCard />
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Owner-conversion filler tile that ends a sparse grid. Visually distinct from
 * a shop card (branded teal panel + gold accent) so it reads as an invitation,
 * not a result. Matches the card grid cell height via `flex` + `justify-between`.
 */
function OpenShopCtaCard() {
  return (
    <div className="bg-quego-panel rounded-xl p-5 sm:p-6 flex flex-col justify-between gap-5 min-h-[180px] border border-outline-variant/20 shadow-sm">
      <div className="flex flex-col gap-2">
        <span className="inline-flex w-11 h-11 items-center justify-center rounded-full bg-on-primary/10 text-secondary-fixed-dim">
          <Icon name="add_business" size={24} />
        </span>
        <h3 className="font-display text-headline-md text-on-primary leading-tight">
          เปิดร้านของคุณบน Quego
        </h3>
        <p className="text-label-md text-on-primary/80">
          รับลูกค้าจองคิวออนไลน์ ฟรี ไม่มีค่าใช้จ่าย
        </p>
      </div>
      <Link
        href="/business"
        className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-full bg-secondary text-on-secondary text-label-lg font-semibold hover:bg-secondary-fixed-variant transition-colors self-start"
      >
        <Icon name="storefront" size={18} />
        เปิดร้านฟรี
      </Link>
    </div>
  );
}

/** Sort key: open (0) before unknown (1) before closed (2). */
function openRank(state: ShopOpenState): number {
  return state === "open" ? 0 : state === "unknown" ? 1 : 2;
}

/**
 * Free-text match across the fields a customer would actually search by — the
 * shop name, its **services** (the key fix: "ทำสีผม"/"นวดเท้า" now find the shop),
 * and its area/address. Empty query matches everything.
 */
function matchesQuery(shop: DiscoveryShop, q: string): boolean {
  if (!q) return true;
  if (shop.name.toLowerCase().includes(q)) return true;
  if (shop.services.some((s) => s.name.toLowerCase().includes(q))) return true;
  const haystack = [
    shop.description,
    shop.address,
    shop.subdistrict,
    shop.district,
    shop.province,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

/**
 * Exact-match on the canonical (province, district, subdistrict) strings. A
 * district filter implies its province; a province-only filter matches every
 * district in it. Shops without a saved location never match an active filter.
 */
function matchesLocation(shop: DiscoveryShop, loc: LocationValue | null): boolean {
  if (!loc) return true;
  if (shop.province !== loc.province) return false;
  if (loc.district && shop.district !== loc.district) return false;
  if (loc.subdistrict && shop.subdistrict !== loc.subdistrict) return false;
  return true;
}

function ActiveFilters({
  query,
  location,
  resultCount,
}: {
  query: string;
  location: LocationValue | null;
  resultCount: number;
}) {
  const q = query.trim();
  const where = location ? locationLabel(location) : null;
  return (
    <div className="max-w-[1180px] mx-auto w-full flex flex-wrap items-center gap-2">
      <span className="text-label-md font-semibold text-on-surface">
        พบ {resultCount} ร้าน
      </span>
      {q ? <FilterPill icon="search" label={`“${q}”`} /> : null}
      {where ? <FilterPill icon="location_on" label={where} /> : null}
      <Link
        href="/#shops"
        className="inline-flex items-center gap-1 text-label-md text-on-surface-variant hover:text-primary transition-colors"
      >
        <Icon name="close" size={16} />
        ล้างตัวกรอง
      </Link>
    </div>
  );
}

function FilterPill({ icon, label }: { icon: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full bg-primary/10 text-primary text-label-sm font-medium">
      <Icon name={icon} size={14} />
      {label}
    </span>
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
        "shrink-0 inline-flex items-center gap-1.5 h-10 px-4 rounded-full border text-label-md font-semibold transition-all duration-200 ease-out active:scale-[0.97]",
        active
          ? "bg-primary text-on-primary border-primary"
          : "bg-surface-container-lowest text-on-surface-variant border-outline-variant hover:border-primary hover:text-primary",
      )}
    >
      <Icon name={icon} size={18} />
      {label}
      <span
        className={cn(
          "text-label-sm font-bold tabular-nums",
          active ? "text-on-primary/80" : "text-on-surface-variant/70",
        )}
      >
        {count}
      </span>
    </button>
  );
}

/**
 * "ใกล้ฉัน" toggle. Off → requests geolocation on tap; on → shows the active
 * state and clears on tap. Privacy: geolocation is only ever requested by an
 * explicit tap, never on load.
 */
function NearMeButton({
  active,
  busy,
  onClick,
}: {
  active: boolean;
  busy: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      disabled={busy}
      className={cn(
        "shrink-0 inline-flex items-center gap-1.5 h-9 px-4 rounded-full border text-label-md font-semibold transition-all duration-200 ease-out active:scale-[0.97] disabled:opacity-60",
        active
          ? "bg-primary text-on-primary border-primary"
          : "bg-surface-container-lowest text-on-surface-variant border-outline-variant hover:border-primary hover:text-primary",
      )}
    >
      <Icon name={busy ? "progress_activity" : "near_me"} size={18} className={busy ? "animate-spin" : undefined} />
      {busy ? "กำลังหาตำแหน่ง..." : active ? "เรียงตามระยะทาง" : "ใกล้ฉัน"}
      {active && !busy ? <Icon name="close" size={16} /> : null}
    </button>
  );
}

function NoResults({
  query,
  location,
}: {
  query: string;
  location: LocationValue | null;
}) {
  const q = query.trim();
  const where = location ? locationLabel(location) : null;

  const message =
    q && where
      ? `ไม่พบ “${q}” ในพื้นที่ ${where}`
      : q
        ? `ไม่พบร้านที่ตรงกับ “${q}”`
        : where
          ? `ยังไม่มีร้านในพื้นที่ ${where}`
          : "ไม่พบร้าน";

  return (
    <div className="bg-surface-container-lowest border border-dashed border-outline-variant rounded-xl p-12 text-center max-w-2xl mx-auto">
      <div className="w-16 h-16 mx-auto rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant mb-4">
        <Icon name="search_off" size={32} />
      </div>
      <p className="text-body-md text-on-surface">{message}</p>
      <p className="text-label-md text-on-surface-variant mt-1">
        ลองเปลี่ยนพื้นที่ คำค้น หรือเลือกหมวดหมู่ด้านบน
      </p>
    </div>
  );
}
