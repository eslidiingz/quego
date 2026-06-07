import { Icon } from "@/components/ui/Icon";
import { StarRatingDisplay } from "./StarRatingDisplay";
import type {
  ShopRatingSummary,
  ShopReviewItem,
} from "@/lib/services/reviews";

export type ShopReviewsSectionProps = {
  summary: ShopRatingSummary;
  reviews: ShopReviewItem[];
};

/**
 * Customer reviews block for the shop detail page. Single responsibility: lay
 * out the rating summary + the review list. Pure presentation — the server page
 * fetches the data (DIP) and passes the already-masked reviewer names down.
 */
export function ShopReviewsSection({ summary, reviews }: ShopReviewsSectionProps) {
  return (
    <section className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
      <header className="px-5 md:px-6 py-4 border-b border-outline-variant/40">
        <h2 className="font-display text-headline-md text-on-surface">
          รีวิวจากลูกค้า
        </h2>
      </header>

      {summary.count === 0 ? (
        <EmptyReviews />
      ) : (
        <>
          <div className="flex items-center gap-4 px-5 md:px-6 py-5 border-b border-outline-variant/40">
            <p className="font-display font-semibold text-[40px] leading-none text-on-surface tabular-nums">
              {summary.average.toFixed(1)}
            </p>
            <div className="space-y-1">
              <StarRatingDisplay value={summary.average} size={20} />
              <p className="text-label-md text-on-surface-variant">
                {summary.count} รีวิว
              </p>
            </div>
          </div>

          <ul className="divide-y divide-outline-variant/40">
            {reviews.map((review) => (
              <li key={review.id} className="px-5 md:px-6 py-4 space-y-1.5">
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
                  <p className="text-body-md text-on-surface-variant whitespace-pre-line break-words">
                    {review.comment}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function EmptyReviews() {
  return (
    <div className="px-5 md:px-6 py-10 text-center">
      <div className="w-14 h-14 mx-auto rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant mb-3">
        <Icon name="reviews" size={28} />
      </div>
      <p className="text-body-md text-on-surface">ยังไม่มีรีวิว</p>
      <p className="text-label-md text-on-surface-variant mt-1">
        เป็นคนแรกที่รีวิวร้านนี้
      </p>
    </div>
  );
}

/**
 * Format an ISO timestamp as a short Thai date with the Buddhist year (+543).
 * The calendar parts are taken in Bangkok time (ICT) — never host-local — so a
 * review created just before/after local midnight shows the correct Thai date
 * regardless of where the server runs (project rule: business dates are ICT).
 * Local to this component — small enough not to warrant a shared util, and the
 * BookingCard's formatter is private to that file (date-only, not ISO).
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
