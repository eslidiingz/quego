import { requireShopSession } from "@/lib/auth/shop-session-server";
import { ShopShell } from "@/components/shop/ShopShell";
import { ImpersonationBanner } from "@/components/shop/ImpersonationBanner";
import { ShopNotifier } from "@/components/shop/ShopNotifier";

export const dynamic = "force-dynamic";

export default async function ShopAuthedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireShopSession();
  const isImpersonating = Boolean(session.impersonatedBy);
  // Baseline cursor for the live notifier — only events (new bookings and
  // customer cancellations) that occur after this page load are announced.
  // UTC, to match `bookings.created_at` / `bookings.updated_at`.
  const initialSinceIso = new Date().toISOString();

  return (
    <>
      {isImpersonating ? (
        <ImpersonationBanner shopName={session.shopName} />
      ) : null}
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
