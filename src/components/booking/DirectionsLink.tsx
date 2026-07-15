import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { buildShopDirectionsUrl, type ShopLocation } from "@/lib/location/maps";

export type DirectionsLinkProps = {
  /** Shop location fields — a pin is used when present, else the address text. */
  shop: ShopLocation;
  /** Link label; defaults to "นำทาง". */
  label?: string;
  className?: string;
  iconSize?: number;
};

/**
 * "นำทาง" link that opens Google Maps directions to a shop. Prefers the precise
 * pin, falls back to the address text — see buildShopDirectionsUrl. Renders
 * nothing when the shop has neither, so callers can drop it in unconditionally.
 *
 * Plain markup (no hooks) so it works in both server and client components. Zero
 * Maps API cost — it is just a universal deep link the user's own Maps opens.
 */
export function DirectionsLink({
  shop,
  label = "นำทาง",
  className,
  iconSize = 18,
}: DirectionsLinkProps) {
  const href = buildShopDirectionsUrl(shop);
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center gap-1.5 min-h-[44px] text-label-md font-semibold text-primary hover:underline",
        className,
      )}
    >
      <Icon name="directions" size={iconSize} />
      {label}
    </a>
  );
}
