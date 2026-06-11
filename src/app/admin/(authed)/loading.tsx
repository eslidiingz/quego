import { CardListSkeleton, PageHeaderSkeleton } from "@/components/ui/Skeleton";

/**
 * Instant fallback for the admin area. The {@link AdminShell} sidebar stays
 * mounted; only the content region swaps to this skeleton while the next page
 * streams. Container mirrors the real admin pages to avoid a layout shift.
 */
export default function Loading() {
  return (
    <div className="p-4 md:p-12 max-w-[1280px] mx-auto w-full space-y-stack-md">
      <PageHeaderSkeleton />
      <CardListSkeleton rows={5} />
    </div>
  );
}
