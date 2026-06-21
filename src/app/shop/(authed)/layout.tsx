import { requireShopSession } from "@/lib/auth/shop-session-server";
import { getShopSetupStep } from "@/lib/services/shop-setup";
import { ShopShell } from "@/components/shop/ShopShell";
import { ImpersonationBanner } from "@/components/shop/ImpersonationBanner";
import { ShopSetupModal } from "@/components/shop/ShopSetupModal";
import { ShopNotifier } from "@/components/shop/ShopNotifier";

export const dynamic = "force-dynamic";

export default async function ShopAuthedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireShopSession();
  const isImpersonating = Boolean(session.impersonatedBy);
  // Resolved once per request; the modal then follows the owner across every
  // management page (client-side) until services + hours are configured.
  const setupStep = await getShopSetupStep(session.shopId);
  // Baseline cursor for the live notifier — only events (new bookings and
  // customer cancellations) that occur after this page load are announced.
  // UTC, to match `bookings.created_at` / `bookings.updated_at`.
  const initialSinceIso = new Date().toISOString();

  return (
    <>
      {isImpersonating ? (
        <ImpersonationBanner shopName={session.shopName} />
      ) : null}
      {setupStep ? <ShopSetupModal step={setupStep} /> : null}
      <ShopShell
        shopName={session.shopName}
        shopPhone={session.phone}
        isImpersonating={isImpersonating}
        headerSlot={<ShopNotifier initialSinceIso={initialSinceIso} />}
      >
        {children}
      </ShopShell>
    </>
  );
}
