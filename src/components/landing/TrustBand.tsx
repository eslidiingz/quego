import { Icon } from "@/components/ui/Icon";

type TrustItem = {
  /** Big figure (Sora display). */
  value: string;
  /** Caption under the figure. */
  label: string;
  /** Optional leading icon (e.g. a star for the rating item). */
  icon?: string;
  /** Tailwind class for the icon color. */
  iconClassName?: string;
};

/**
 * Social-proof band that sits directly under the hero — compact figures that
 * tell a first-time visitor the platform is real and used. Counts arrive as
 * props (DIP); this component owns no data.
 *
 * SRP: present whichever metrics are non-empty. During bootstrap (0 shops / no
 * reviews) the weak items are dropped entirely rather than shown as "0" or "—",
 * and if nothing is worth showing the whole band renders nothing.
 */
export function TrustBand({
  shopCount,
  categoryCount,
  totalReviews,
  avgRating,
}: {
  shopCount: number;
  categoryCount: number;
  totalReviews: number;
  avgRating: number | null;
}) {
  const items: TrustItem[] = [
    ...(shopCount > 0
      ? [{ value: `${shopCount}`, label: "ร้านพร้อมให้จอง" }]
      : []),
    ...(avgRating != null
      ? [
          {
            value: avgRating.toFixed(1),
            label: "คะแนนรีวิวเฉลี่ย",
            icon: "star",
            iconClassName: "text-tertiary",
          },
        ]
      : []),
    ...(totalReviews > 0
      ? [{ value: `${totalReviews}`, label: "รีวิวจากลูกค้าจริง" }]
      : []),
    ...(categoryCount > 0
      ? [{ value: `${categoryCount}`, label: "หมวดบริการความงาม" }]
      : []),
  ];

  if (items.length === 0) return null;

  return (
    <section aria-label="ตัวเลขความน่าเชื่อถือของ Quego" className="px-4 md:px-12">
      <div className="max-w-[1180px] mx-auto -mt-8 relative z-10">
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-px overflow-hidden rounded-xl border border-outline-variant bg-outline-variant shadow-tinted">
          {items.map((item) => (
            <div
              key={item.label}
              className="flex flex-col items-center justify-center gap-1 bg-surface px-4 py-6 text-center"
            >
              <dd className="flex items-center gap-1.5 font-display font-bold text-display-sm text-on-surface">
                {item.icon ? (
                  <Icon
                    name={item.icon}
                    filled
                    size={24}
                    className={item.iconClassName}
                  />
                ) : null}
                {item.value}
              </dd>
              <dt className="text-label-md text-on-surface-variant">
                {item.label}
              </dt>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
