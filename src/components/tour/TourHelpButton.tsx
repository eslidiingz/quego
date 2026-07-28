"use client";

import { Icon } from "@/components/ui/Icon";
import type { ShopTourId } from "@/lib/tour/shop-tours";
import { useTour } from "./TourProvider";

/**
 * The per-page tour entry point: a small round "?" that replays the guided tour
 * for the page it sits on.
 *
 * Pages pass it to `PageHeader`'s `help` slot, so it lands in exactly the same
 * spot on every screen — owners learn one place to look for help instead of
 * hunting for a menu item.
 */
export function TourHelpButton({
  tourId,
  label = "ดูวิธีใช้หน้านี้",
}: {
  tourId: ShopTourId;
  label?: string;
}) {
  const { startTour } = useTour();

  return (
    <button
      type="button"
      onClick={() => startTour(tourId)}
      aria-label={label}
      title={label}
      className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-outline-variant text-on-surface-variant transition-colors duration-200 ease-out hover:border-outline hover:bg-surface-container-low hover:text-on-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    >
      <Icon name="help" size={20} />
    </button>
  );
}
