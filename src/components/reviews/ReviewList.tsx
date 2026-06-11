"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { ReviewItem } from "./ReviewItem";
import type { ShopReviewItem } from "@/lib/services/reviews";

export type ReviewListProps = {
  reviews: ShopReviewItem[];
  /** How many reviews to show before the "ดูรีวิวทั้งหมด" control. */
  initialCount?: number;
};

/**
 * Client island that keeps the reviews block compact by default: it renders
 * only the first `initialCount` reviews and exposes a single toggle to reveal
 * the rest (and collapse them again). Single responsibility — the visible
 * count. Per-comment "read more" lives in {@link ReviewItem}; the summary and
 * section chrome stay in the server section. All reviews are already loaded by
 * the page, so expanding is instant with no extra fetch.
 */
export function ReviewList({ reviews, initialCount = 3 }: ReviewListProps) {
  const [expanded, setExpanded] = useState(false);
  const hasMore = reviews.length > initialCount;
  const visible = expanded ? reviews : reviews.slice(0, initialCount);
  const hiddenCount = reviews.length - initialCount;

  return (
    <>
      <ul className="divide-y divide-outline-variant/40">
        {visible.map((review) => (
          <ReviewItem key={review.id} review={review} />
        ))}
      </ul>

      {hasMore ? (
        <div className="px-5 md:px-6 py-4 border-t border-outline-variant/40">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="inline-flex items-center justify-center gap-1.5 w-full h-11 rounded-full border-2 border-outline-variant text-on-surface text-label-md font-medium hover:bg-surface-container-low hover:border-outline active:scale-[0.99] transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            {expanded ? (
              <>
                ย่อรายการ
                <Icon name="expand_less" size={18} />
              </>
            ) : (
              <>
                ดูอีก {hiddenCount} รีวิว
                <Icon name="expand_more" size={18} />
              </>
            )}
          </button>
        </div>
      ) : null}
    </>
  );
}
