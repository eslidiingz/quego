import Link from "next/link";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/Icon";

export type PublicShopCardProps = {
  id: string;
  name: string;
  description?: string | null;
  address?: string | null;
  serviceDurationMinutes: number;
  categoryIcon?: string | null;
  className?: string;
};

/**
 * Customer-facing shop card built around the real data we have today
 * (name / description / address / service duration / category icon).
 * The hero image / rating / distance slots from the storybook `ShopCard`
 * are deliberately left out — they'll be added when the underlying data
 * is captured by future features.
 *
 * SRP: render the card. The click target is a `<Link>` to the (future)
 * shop detail route — no fetch or state inside.
 */
export function PublicShopCard({
  id,
  name,
  description,
  address,
  serviceDurationMinutes,
  categoryIcon,
  className,
}: PublicShopCardProps) {
  return (
    <Link
      href={`/shops/${id}`}
      className={cn(
        "group flex flex-col bg-surface-container-lowest rounded-xl overflow-hidden border border-outline-variant/40 shadow-sm hover:shadow-luxury transition-all",
        className,
      )}
    >
      <div className="relative h-24 sm:h-32 bg-luxury-gradient flex items-center justify-center">
        <Icon
          name={categoryIcon ?? "storefront"}
          className="text-on-primary opacity-90 text-[36px] sm:text-[48px]"
        />
        <span className="absolute top-2 right-2 sm:top-3 sm:right-3 px-2 py-0.5 sm:px-3 sm:py-1 rounded-full bg-white/90 backdrop-blur-sm text-[10px] sm:text-label-sm font-bold text-primary inline-flex items-center gap-1 shadow-sm whitespace-nowrap">
          <Icon name="schedule" size={12} />
          {formatDuration(serviceDurationMinutes)}
        </span>
      </div>
      <div className="p-3 sm:p-5 flex flex-col gap-1 sm:gap-2 flex-1">
        <h3 className="font-display text-base sm:text-headline-md text-on-surface leading-tight line-clamp-2">
          {name}
        </h3>
        {description ? (
          <p className="text-label-md sm:text-body-md text-on-surface-variant line-clamp-2 hidden sm:block">
            {description}
          </p>
        ) : null}
        {address ? (
          <p className="text-label-sm sm:text-label-md text-on-surface-variant flex items-start gap-1 mt-auto pt-1 sm:pt-2">
            <Icon name="location_on" size={14} className="shrink-0 mt-0.5" />
            <span className="line-clamp-1">{address}</span>
          </p>
        ) : null}
      </div>
    </Link>
  );
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} นาที`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  if (rem === 0) return `${hours} ชม.`;
  return `${hours} ชม. ${rem} นาที`;
}
