import { requireShopSession } from "@/lib/auth/shop-session-server";
import { ShopShell } from "@/components/shop/ShopShell";
import { ImpersonationBanner } from "@/components/shop/ImpersonationBanner";

export const dynamic = "force-dynamic";

export default async function ShopAuthedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireShopSession();
  const isImpersonating = Boolean(session.impersonatedBy);

  return (
    <>
      {isImpersonating ? (
        <ImpersonationBanner shopName={session.shopName} />
      ) : null}
      <ShopShell
        shopName={session.shopName}
        shopPhone={session.phone}
        isImpersonating={isImpersonating}
      >
        {children}
      </ShopShell>
    </>
  );
}
