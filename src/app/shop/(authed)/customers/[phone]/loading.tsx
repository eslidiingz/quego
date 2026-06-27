import {
  PageHeaderSkeleton,
  Skeleton,
  CardListSkeleton,
} from "@/components/ui/Skeleton";

/**
 * Instant fallback for the customer-profile segment. Mirrors the real page's
 * container (max-w-[960px]) + the 6-tile summary grid + note card + history
 * list, so the swap to the streamed page is shift-free. The ShopShell sidebar
 * stays mounted; only this content region shows the skeleton.
 */
export default function Loading() {
  return (
    <div className="p-4 md:p-12 max-w-[960px] mx-auto w-full space-y-stack-md">
      <PageHeaderSkeleton withAction />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[88px] w-full rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-52 w-full rounded-xl" />
      <CardListSkeleton rows={3} />
    </div>
  );
}
