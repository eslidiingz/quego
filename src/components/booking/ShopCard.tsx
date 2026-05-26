import { cn } from "@/lib/cn";
import { Icon } from "../ui/Icon";
import { Button } from "../ui/Button";

export type ShopTag = { label: string; tone?: "primary" | "secondary" };

export type ShopCardProps = {
  name: string;
  imageUrl: string;
  rating: number;
  distanceLabel: string;
  location: string;
  tags?: ShopTag[];
  ctaLabel?: string;
  onCtaClick?: () => void;
  className?: string;
};

export function ShopCard({
  name,
  imageUrl,
  rating,
  distanceLabel,
  location,
  tags = [],
  ctaLabel = "จองคิวทันที",
  onCtaClick,
  className,
}: ShopCardProps) {
  return (
    <article
      className={cn(
        "group bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm hover:shadow-luxury transition-all border border-outline-variant/30 flex flex-col",
        className,
      )}
    >
      <div className="h-48 w-full overflow-hidden relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full flex items-center gap-1 shadow-sm">
          <Icon name="star" filled className="text-secondary !text-base" size={16} />
          <span className="text-label-sm font-bold text-on-surface">{rating.toFixed(1)}</span>
        </div>
      </div>
      <div className="p-5 flex flex-col gap-3 flex-1">
        <div className="flex justify-between items-start gap-3">
          <h4 className="font-display text-headline-md text-on-surface leading-tight">{name}</h4>
          <span className="text-primary font-bold text-headline-md whitespace-nowrap">
            {distanceLabel}
          </span>
        </div>
        <p className="text-on-surface-variant text-body-md flex items-center gap-1">
          <Icon name="location_on" size={16} />
          {location}
        </p>
        {tags.length > 0 ? (
          <div className="flex gap-2 flex-wrap">
            {tags.map((t) => (
              <span
                key={t.label}
                className={cn(
                  "px-3 py-1 rounded-full text-label-sm",
                  t.tone === "secondary"
                    ? "bg-secondary-container/30 text-on-secondary-container"
                    : "bg-primary-container/10 text-primary-container",
                )}
              >
                {t.label}
              </span>
            ))}
          </div>
        ) : null}
        <Button fullWidth onClick={onCtaClick} className="mt-auto">
          {ctaLabel}
        </Button>
      </div>
    </article>
  );
}
