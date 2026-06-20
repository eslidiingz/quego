import { requireShopSession } from "@/lib/auth/shop-session-server";
import { listPromotionsByShop } from "@/lib/services/promotions";
import { PromotionManager } from "./PromotionManager";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "โปรโมชั่น · Quego",
};

export default async function ShopPromotionsPage() {
  const session = await requireShopSession();
  const promotions = await listPromotionsByShop(session.shopId);

  return (
    <div className="p-4 md:p-12 max-w-[1280px] mx-auto w-full">
      <PromotionManager promotions={promotions} />
    </div>
  );
}
