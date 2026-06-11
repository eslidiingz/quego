import { Icon } from "@/components/ui/Icon";
import { ReviewList } from "./ReviewList";
import type {
  ShopRatingSummary,
  ShopReviewItem,
} from "@/lib/services/reviews";

export type ShopReviewsSectionProps = {
  summary: ShopRatingSummary;
  reviews: ShopReviewItem[];
};

/**
 * Customer reviews block for the shop detail page. Single responsibility: the
 * section chrome + the always-visible rating summary. The review list itself
 * (compact-by-default with a "ดูรีวิวทั้งหมด" toggle) is delegated to the
 * {@link ReviewList} client island so the server section stays a pure server
 * component. Pure presentation — the page fetches the data (DIP) and passes
 * the already-masked reviewer names down.
 */
export function ShopReviewsSection({ summary, reviews }: ShopReviewsSectionProps) {
  const hasReviews = summary.count > 0;
  return (
    <section className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
      <header className="flex items-center justify-between gap-3 px-5 md:px-6 py-4 border-b border-outline-variant/40">
        <h2 className="font-display text-headline-md text-on-surface flex items-center gap-2">
          รีวิวจากลูกค้า
          {hasReviews ? (
            <span className="text-label-md font-semibold text-on-surface-variant tabular-nums">
              ({summary.count})
            </span>
          ) : null}
        </h2>
        {hasReviews ? <RatingSummaryInline summary={summary} /> : null}
      </header>

      {hasReviews ? (
        <ReviewList reviews={reviews} initialCount={3} />
      ) : (
        <EmptyReviews />
      )}
    </section>
  );
}

/**
 * Compact right-aligned rating summary that sits inline with the section title:
 * the average (Sora `font-display`) paired with a single gold star. Narrow
 * enough to share the header row with "รีวิวจากลูกค้า" at the 375px baseline.
 */
function RatingSummaryInline({ summary }: { summary: ShopRatingSummary }) {
  return (
    <span
      role="img"
      aria-label={`คะแนนเฉลี่ย ${summary.average.toFixed(1)} จาก 5 ดาว จาก ${summary.count} รีวิว`}
      className="flex items-center gap-1.5 shrink-0"
    >
      <span className="font-display font-semibold text-display-sm leading-none text-on-surface tabular-nums">
        {summary.average.toFixed(1)}
      </span>
      <Icon name="star" filled size={20} className="text-tertiary" />
    </span>
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
        รีวิวได้หลังเข้าใช้บริการที่ร้าน
      </p>
    </div>
  );
}
