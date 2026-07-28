import { requireShopSession } from "@/lib/auth/shop-session-server";
import { getShopOnboarding, getShopSetupStep } from "@/lib/services/shop-setup";
import { ShopShell } from "@/components/shop/ShopShell";
import { ImpersonationBanner } from "@/components/shop/ImpersonationBanner";
import { ShopSetupModal } from "@/components/shop/ShopSetupModal";
import { ShopNotifier } from "@/components/shop/ShopNotifier";
import { ShopTourProvider } from "@/components/tour/ShopTourProvider";
import { ShopTourBootstrap } from "@/components/shop/ShopTourBootstrap";

export const dynamic = "force-dynamic";

export default async function ShopAuthedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireShopSession();
  const isImpersonating = Boolean(session.impersonatedBy);
  // Both resolve from one `cache()`-memoized read that the dashboard's checklist
  // card shares, so this costs a single fan-out per request. The modal then
  // follows the owner across every management page until services + hours exist.
  const [setupStep, { tourSeenAt }] = await Promise.all([
    getShopSetupStep(session.shopId),
    getShopOnboarding(session.shopId),
  ]);
  // A brand-new shop always has an outstanding blocker — i.e. exactly the owner
  // the welcome tour exists for. Hold the modal back until the tour has been
  // seen, so the two never stack. Order: tour → checklist → blocking modal.
  const showSetupModal = setupStep !== null && tourSeenAt !== null;
  // Never burn the real owner's one first run on an admin's impersonated visit.
  const autoStartTour = tourSeenAt === null && !isImpersonating;
  // Baseline cursor for the live notifier — only events (new bookings and
  // customer cancellations) that occur after this page load are announced.
  // UTC, to match `bookings.created_at` / `bookings.updated_at`.
  const initialSinceIso = new Date().toISOString();

  return (
    // The tour provider wraps everything, including the setup modal — the modal
    // asks `useTour()` whether a tour is running so the two never stack.
    <ShopTourProvider>
      {isImpersonating ? (
        <ImpersonationBanner shopName={session.shopName} />
      ) : null}
      <ShopTourBootstrap enabled={autoStartTour} />
      {showSetupModal && setupStep ? <ShopSetupModal step={setupStep} /> : null}
      <ShopShell
        shopName={session.shopName}
        shopPhone={session.phone}
        isImpersonating={isImpersonating}
        headerSlot={<ShopNotifier initialSinceIso={initialSinceIso} />}
      >
        {children}
      </ShopShell>
    </ShopTourProvider>
  );
}
