"use client";

import { usePathname } from "next/navigation";
import { FullPageSpinner, Skeleton } from "@/components/ui/Skeleton";

/**
 * Universal instant fallback — the root Suspense boundary. Covers any segment
 * without its own `loading.tsx` (home discovery, login/PIN flows, shop
 * registration, kiosk display) so every navigation shows a loading state
 * before the page's DOM streams in.
 *
 * The home route (`/`) is `force-dynamic` and runs batched Supabase reads, so
 * the user would otherwise stare at a blank screen until the grid streams in.
 * For that one path we render a layout-matched skeleton (nav + hero + card
 * grid) to cut perceived wait and layout shift; every other route keeps the
 * branded {@link FullPageSpinner}, whose neutral chrome fits login / register /
 * kiosk where a home-shaped skeleton would read as wrong.
 *
 * Client component (allowed for `loading.js`) only so it can branch on the
 * requested path — it holds no state and fetches nothing.
 */
export default function Loading() {
  const pathname = usePathname();
  if (pathname === "/") return <HomeSkeleton />;
  return <FullPageSpinner />;
}

/** Skeleton mirroring the home page chrome — see `src/app/page.tsx`. */
function HomeSkeleton() {
  return (
    <div
      role="status"
      aria-label="กำลังโหลด"
      className="min-h-screen flex flex-col bg-background"
    >
      {/* Nav placeholder — mirrors LandingNav's sticky bar */}
      <div className="flex items-center justify-between gap-3 px-4 md:px-12 py-3.5 border-b border-outline-variant">
        <Skeleton className="h-7 w-28" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24 rounded-full" />
          <Skeleton className="h-9 w-9 rounded-full" />
          <Skeleton className="h-9 w-20 rounded-full" />
        </div>
      </div>

      {/* Hero placeholder — deep-teal branded surface, like LandingHero */}
      <div className="bg-quego-hero px-4 md:px-12 pt-12 pb-14 md:pt-16 md:pb-20">
        <div className="max-w-[1180px] mx-auto w-full flex flex-col items-center gap-4 text-center">
          <Skeleton className="h-10 w-72 max-w-full rounded-lg bg-on-primary/15" />
          <Skeleton className="h-10 w-56 max-w-full rounded-lg bg-on-primary/15" />
          <Skeleton className="h-5 w-80 max-w-full bg-on-primary/10" />
          <Skeleton className="mt-3 h-14 w-full max-w-xl rounded-full bg-on-primary/15" />
        </div>
      </div>

      {/* Section heading placeholder */}
      <div className="max-w-[1180px] mx-auto w-full px-4 md:px-12 pt-12 md:pt-16">
        <div className="mb-6 space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
      </div>

      {/* Filter chips placeholder */}
      <div className="max-w-[1180px] mx-auto w-full px-4 md:px-12">
        <div className="flex gap-2 pb-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-24 shrink-0 rounded-full" />
          ))}
        </div>
      </div>

      {/* Results grid placeholder — mirrors ShopDiscovery's card grid */}
      <div className="max-w-[1180px] mx-auto w-full px-4 md:px-12 pt-stack-md pb-stack-md">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <ShopCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

/** One placeholder card matching PublicShopCard's banner + body proportions. */
function ShopCardSkeleton() {
  return (
    <div className="flex flex-col bg-surface-container-lowest rounded-xl overflow-hidden border border-outline-variant/40 shadow-sm">
      <Skeleton className="h-20 sm:h-28 w-full rounded-none" />
      <div className="p-3 sm:p-4 flex flex-col gap-3">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-3.5 w-1/2" />
        <div className="flex gap-1.5 pt-1">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <Skeleton className="h-3.5 w-24" />
      </div>
    </div>
  );
}
