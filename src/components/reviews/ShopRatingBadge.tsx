import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import type { ShopRatingSummary } from "@/lib/services/reviews";

export type ShopRatingBadgeProps = {
  rating: ShopRatingSummary;
  className?: string;
};

/**
 * Compact frosted rating pill for the shop-card banner. Single responsibility:
 * show the average + count when reviews exist. Renders `null` for an unrated
 * shop so the card stays clean (no "0.0" noise). The frosted treatment mirrors
 * the closed-state chip so it stays legible on the teal banner gradient.
 */
export function ShopRatingBadge({ rating, className }: ShopRatingBadgeProps) {
  if (rating.count === 0) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-surface/90 backdrop-blur-sm shadow-sm px-2 py-0.5 text-label-sm font-semibold text-on-surface",
        className,
      )}
    >
      <Icon name="star" filled size={14} className="text-tertiary" />
      <span className="tabular-nums">{rating.average.toFixed(1)}</span>
      <span className="text-on-surface-variant font-normal tabular-nums">
        ({rating.count})
      </span>
    </span>
  );
}
