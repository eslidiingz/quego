import Link from "next/link";
import { requireShopSession } from "@/lib/auth/shop-session-server";
import { Icon } from "@/components/ui/Icon";
import { ShopTourProvider } from "@/components/tour/ShopTourProvider";
import { TourHelpButton } from "@/components/tour/TourHelpButton";
import { TOUR_ANCHORS } from "@/lib/tour/anchors";

/**
 * Chrome-free layout for the shop waiting-room DISPLAY (`/shop/display`, OPP-07).
 *
 * Deliberately NOT `ShopShell` — the kiosk runs on a tablet propped up in the
 * waiting room, so there is no sidebar, header, or nav: just a full-height
 * surface for the queue. `requireShopSession()` re-checks the session here as
 * defence-in-depth on top of `proxy.ts` (the `(display)` route group has no URL
 * impact, so this still lives under the proxy-guarded `/shop` namespace).
 *
 * A small unobtrusive corner link back to `/shop` keeps the kiosk escapable —
 * a staff member can always leave display mode.
 */
export const dynamic = "force-dynamic";

export default async function ShopDisplayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireShopSession();

  return (
    // This route group is a sibling of `(authed)`, so it is outside that
    // layout's provider and needs its own for the `?` button to work here.
    <ShopTourProvider>
      <div className="relative min-h-screen bg-background">
        <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
          <TourHelpButton tourId="shop-display" />
          <Link
            href="/shop"
            data-tour={TOUR_ANCHORS.displayExit}
            aria-label="ออกจากโหมดจอแสดงผล"
            title="ออกจากโหมดจอแสดงผล"
            className="inline-flex items-center justify-center rounded-full border border-outline-variant bg-surface/80 p-2 text-on-surface-variant backdrop-blur transition-colors hover:bg-surface-container-high"
          >
            <Icon name="close" size={18} />
          </Link>
        </div>
        {children}
      </div>
    </ShopTourProvider>
  );
}
