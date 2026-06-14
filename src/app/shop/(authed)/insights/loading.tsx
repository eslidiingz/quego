import { Skeleton, PageHeaderSkeleton } from "@/components/ui/Skeleton";

/**
 * Instant fallback for the shop report while it streams. Mirrors the real
 * layout (header → filter bar → hero → 2×2 tiles → two ranked sections) so the
 * swap doesn't shift the page. Overrides the generic shop-area loading.
 */
export default function Loading() {
  return (
    <div className="p-4 md:p-12 max-w-[1280px] mx-auto w-full space-y-stack-md">
      <PageHeaderSkeleton />

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Skeleton className="h-9 w-72 rounded-full" />
        <Skeleton className="h-9 w-24 rounded-full" />
      </div>

      {/* Hero revenue card */}
      <Skeleton className="h-32 w-full rounded-2xl" />

      {/* 2×2 metric tiles */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-2xl" />
        ))}
      </div>

      {/* Ranked sections + chart */}
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-56 w-full rounded-2xl" />
      ))}
    </div>
  );
}
