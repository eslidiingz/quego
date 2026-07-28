"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useTour } from "@/components/tour/TourProvider";
import { markShopTourSeenAction } from "@/app/shop/(authed)/onboarding/actions";

/**
 * Auto-runs the welcome tour once, the first time an owner lands on `/shop`.
 *
 * Renders nothing. The layout decides *whether* the owner is eligible (server
 * side, from `shops.tour_seen_at`) so a returning owner never sees the overlay
 * flash; this component only handles the "when" and records the outcome.
 *
 * Stamped on finish AND on skip: an owner who dismissed it once shouldn't be
 * ambushed again on their next visit. The `?` button on every page replays it
 * whenever they actually want it.
 */
export function ShopTourBootstrap({ enabled }: { enabled: boolean }) {
  const { startTour } = useTour();
  const pathname = usePathname();
  // The layout persists across soft navigations, so without this the tour would
  // restart every time the owner navigated back to /shop before the stamp lands.
  const startedRef = useRef(false);

  useEffect(() => {
    if (!enabled || startedRef.current) return;
    // Only on the dashboard: that's where the tour's anchors live, and it's
    // where a newly-registered owner arrives.
    if (pathname !== "/shop") return;

    startedRef.current = true;
    startTour("shop-welcome", {
      onEnd: () => {
        // Fire-and-forget: a failed stamp just means the tour offers itself
        // again next visit, which is a far better failure than blocking the UI.
        void markShopTourSeenAction().catch(() => {});
      },
    });
  }, [enabled, pathname, startTour]);

  return null;
}
