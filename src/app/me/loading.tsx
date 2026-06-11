import {
  CardListSkeleton,
  PageHeaderSkeleton,
  Skeleton,
} from "@/components/ui/Skeleton";

/**
 * Instant fallback for the customer area. The persistent {@link MeLayout} chrome
 * (top bar + bottom tab bar) stays mounted and interactive; only this main-area
 * skeleton swaps in while the next page streams — so tab-switching feels like a
 * native app. Container mirrors the real pages to avoid a layout shift.
 */
export default function Loading() {
  return (
    <div className="max-w-3xl mx-auto w-full px-4 md:px-6 py-6 space-y-stack-md">
      <PageHeaderSkeleton />
      <Skeleton className="h-12 w-full max-w-md rounded-full" />
      <CardListSkeleton rows={3} />
    </div>
  );
}
