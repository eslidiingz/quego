"use client";

import { useState } from "react";
import { StarRatingDisplay } from "./StarRatingDisplay";
import type { ShopReviewItem } from "@/lib/services/reviews";

export type ReviewItemProps = {
  review: ShopReviewItem;
};

/**
 * A single customer review row. Single responsibility: render one review and
 * locally manage the read-more toggle for a long comment so a wall of text
 * never blows out the section height. Short comments render in full and show
 * no toggle. Reviewer name arrives already masked from the service (PDPA) —
 * this component never sees a raw name.
 */
export function ReviewItem({ review }: ReviewItemProps) {
  const [expanded, setExpanded] = useState(false);
  // Comments shorter than this fit comfortably in ~3 lines on a 375px screen,
  // so there's nothing to collapse — only longer ones get a "read more" toggle.
  const isLongComment = (review.comment?.length ?? 0) > 140;

  return (
    <li className="px-5 md:px-6 py-4 space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <StarRatingDisplay value={review.rating} size={16} />
        <span className="text-label-sm text-on-surface-variant shrink-0">
          {formatThaiDate(review.createdAt)}
        </span>
      </div>
      <p className="text-label-md font-medium text-on-surface">
        {review.reviewerName}
      </p>
      {review.comment ? (
        <div className="space-y-1">
          <p
            className={
              isLongComment && !expanded
                ? "text-body-md text-on-surface-variant whitespace-pre-line break-words line-clamp-3"
                : "text-body-md text-on-surface-variant whitespace-pre-line break-words"
            }
          >
            {review.comment}
          </p>
          {isLongComment ? (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="text-label-sm font-medium text-primary hover:underline focus:outline-none focus-visible:underline"
              aria-expanded={expanded}
            >
              {expanded ? "ย่อข้อความ" : "อ่านเพิ่มเติม"}
            </button>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

/**
 * Format an ISO timestamp as a short Thai date with the Buddhist year (+543).
 * The calendar parts are taken in Bangkok time (ICT) — never host-local — so a
 * review created just before/after local midnight shows the correct Thai date
 * regardless of where the server runs (project rule: business dates are ICT).
 */
function formatThaiDate(iso: string): string {
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Bangkok",
    day: "numeric",
    month: "numeric",
    year: "numeric",
  }).formatToParts(dt);
  const part = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? "0");
  const day = part("day");
  const month = THAI_MONTH_SHORT[part("month") - 1] ?? "";
  const year = part("year") + 543;
  return `${day} ${month} ${year}`;
}

const THAI_MONTH_SHORT = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
];
