import { Icon } from "@/components/ui/Icon";
import type { FeaturedReview } from "@/lib/services/reviews";

/**
 * A 5-slot star row, gold filled up to `rating`. Decorative: the numeric rating
 * is exposed to assistive tech by the surrounding card label.
 */
function Stars({ rating }: { rating: number }) {
  return (
    <span aria-hidden className="inline-flex items-center gap-0.5 text-tertiary">
      {Array.from({ length: 5 }, (_, i) => (
        <Icon key={i} name="star" filled={i < rating} size={18} />
      ))}
    </span>
  );
}

/**
 * "ลูกค้าพูดถึง Quego" — testimonials wall built from real, high-rated reviews
 * (already masked + filtered in the service layer). Reviews arrive as props
 * (DIP); this component owns no data.
 *
 * SRP: present featured reviews. When there are none it renders nothing, so the
 * lead can render it unconditionally without leaving an empty heading on screen.
 */
export function Testimonials({ items }: { items: FeaturedReview[] }) {
  if (items.length === 0) return null;

  return (
    <section className="px-4 md:px-12 py-14 md:py-18 bg-surface-container-low">
      <div className="max-w-[1180px] mx-auto w-full">
        <div className="mb-8 max-w-[640px]">
          <span className="text-label-sm font-medium uppercase tracking-wide text-primary">
            เสียงจากลูกค้า
          </span>
          <h2 className="font-headline font-semibold text-[24px] sm:text-[30px] tracking-tight text-on-background mt-2">
            ลูกค้าพูดถึง Quego
          </h2>
          <p className="text-body-sm text-on-surface-variant mt-1">
            รีวิวจริงจากลูกค้าที่ใช้บริการผ่าน Quego
          </p>
        </div>

        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((r) => (
            <li
              key={r.id}
              className="flex flex-col bg-surface rounded-xl border border-outline-variant p-6"
            >
              <div
                className="flex items-center gap-2"
                aria-label={`ให้คะแนน ${r.rating} จาก 5 ดาว`}
              >
                <Stars rating={r.rating} />
              </div>

              <p className="text-body-md text-on-surface mt-4 grow">
                “{r.comment}”
              </p>

              <div className="flex items-center gap-3 mt-5 pt-4 border-t border-outline-variant">
                <span className="flex items-center justify-center size-9 shrink-0 rounded-full bg-primary/10 text-primary">
                  <Icon name="person" size={20} />
                </span>
                <div className="min-w-0">
                  <p className="text-label-lg font-semibold text-on-surface truncate">
                    {r.reviewerName}
                  </p>
                  {r.shopName ? (
                    <p className="text-label-md text-on-surface-variant truncate">
                      {r.shopName}
                    </p>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
