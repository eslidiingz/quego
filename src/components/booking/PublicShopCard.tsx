import Link from "next/link";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/Icon";
import { Chip } from "@/components/ui/Chip";

export type ShopOpenState = "open" | "closed" | "unknown";

/** The card only needs a service's name (chip) and price (for "เริ่มต้น ฿"). */
export type ShopCardService = {
  name: string;
  price: number | null;
};

export type PublicShopCardProps = {
  id: string;
  name: string;
  categoryIcon?: string | null;
  /** Short area line (อำเภอ, จังหวัด) — more scannable than a full address. */
  province?: string | null;
  district?: string | null;
  /** Active services — shown as chips with a "from ฿" price beneath. */
  services?: ShopCardService[];
  /** Live open/closed state from today's business hours. */
  openState?: ShopOpenState;
  className?: string;
};

const MAX_VISIBLE_SERVICES = 3;

/**
 * Customer-facing shop card for the discovery grid. We deliberately surface
 * only the booking-decision essentials: name, area, the services on offer, and
 * a "เริ่มต้น ฿" starting price — the long description / full street address are
 * left for the detail page. Live open/closed sits on the banner.
 *
 * SRP: render one card. The whole card is a `<Link>` to the shop detail route;
 * no fetch or state inside.
 */
export function PublicShopCard({
  id,
  name,
  categoryIcon,
  province,
  district,
  services = [],
  openState = "unknown",
  className,
}: PublicShopCardProps) {
  const area = [district, province].filter(Boolean).join(", ");
  const visible = services.slice(0, MAX_VISIBLE_SERVICES);
  const extra = services.length - visible.length;
  const fromPrice = startingPrice(services);

  return (
    <Link
      href={`/shops/${id}`}
      className={cn(
        "group flex flex-col bg-surface-container-lowest rounded-xl overflow-hidden border border-outline-variant/40 shadow-sm hover:shadow-luxury hover:border-primary/30 transition-all duration-300 ease-out",
        className,
      )}
    >
      <div className="relative h-20 sm:h-28 bg-luxury-gradient flex items-center justify-center">
        <Icon
          name={categoryIcon ?? "storefront"}
          className="text-on-primary opacity-90 text-[34px] sm:text-[44px] transition-transform duration-300 ease-out group-hover:scale-110"
        />
        {openState !== "unknown" ? (
          <OpenStateBadge state={openState} />
        ) : null}
      </div>

      <div className="p-3 sm:p-4 flex flex-col gap-2 flex-1">
        <div className="flex flex-col gap-0.5">
          <h3 className="font-display text-body-md sm:text-headline-md text-on-surface leading-tight line-clamp-2">
            {name}
          </h3>
          {area ? (
            <p className="text-label-sm text-on-surface-variant flex items-center gap-1">
              <Icon name="location_on" size={14} className="shrink-0" />
              <span className="truncate">{area}</span>
            </p>
          ) : null}
        </div>

        <div className="mt-auto flex flex-col gap-2 pt-1">
          {visible.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {visible.map((s, i) => (
                <span
                  key={`${s.name}-${i}`}
                  className="max-w-[8rem] truncate rounded-full bg-surface-container px-2 py-0.5 text-label-sm text-on-surface-variant"
                >
                  {s.name}
                </span>
              ))}
              {extra > 0 ? (
                <span className="rounded-full bg-surface-container px-2 py-0.5 text-label-sm font-semibold text-on-surface-variant">
                  +{extra}
                </span>
              ) : null}
            </div>
          ) : null}

          {fromPrice != null ? (
            <p className="text-label-md text-on-surface-variant">
              เริ่มต้น{" "}
              <span className="font-semibold text-primary">
                {formatBaht(fromPrice)}
              </span>
            </p>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

/** Lowest non-null service price, or null when no service is priced. */
function startingPrice(services: ShopCardService[]): number | null {
  let min: number | null = null;
  for (const s of services) {
    if (s.price == null) continue;
    if (min == null || s.price < min) min = s.price;
  }
  return min;
}

function formatBaht(price: number): string {
  return `฿${price.toLocaleString("th-TH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Live availability pill, top-left of the card banner. Open uses a pulsing
 * success chip; closed is a muted neutral chip. `"unknown"` shops render no
 * badge (handled by the caller) so we never mislabel a shop with no hours.
 */
function OpenStateBadge({ state }: { state: "open" | "closed" }) {
  return (
    <span className="absolute top-2 left-2 sm:top-3 sm:left-3">
      {state === "open" ? (
        <Chip variant="success" size="sm" pulse className="shadow-sm">
          เปิดอยู่
        </Chip>
      ) : (
        <Chip
          variant="neutral"
          size="sm"
          className="bg-surface/90 backdrop-blur-sm text-on-surface-variant shadow-sm"
        >
          ปิดแล้ว
        </Chip>
      )}
    </span>
  );
}
