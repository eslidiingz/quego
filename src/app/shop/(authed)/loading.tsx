import { CardListSkeleton, PageHeaderSkeleton } from "@/components/ui/Skeleton";

/**
 * Instant fallback for the shop-owner area. The {@link ShopShell} sidebar stays
 * mounted; only the content region swaps to this skeleton while the next page
 * streams. Container mirrors the real shop pages to avoid a layout shift.
 */
export default function Loading() {
  return (
    <div className="p-4 md:p-12 max-w-[1280px] mx-auto w-full space-y-stack-md">
      <PageHeaderSkeleton withAction />
      <CardListSkeleton rows={4} />
    </div>
  );
}
