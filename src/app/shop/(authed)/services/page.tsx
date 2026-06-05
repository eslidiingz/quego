import { requireShopSession } from "@/lib/auth/shop-session-server";
import { listServicesByShop } from "@/lib/services/services";
import { getShopCategoryRef } from "@/lib/services/shops";
import { listActivePresetsByCategory } from "@/lib/services/service-presets";
import { ServiceManager } from "./ServiceManager";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "บริการ · LuxeQueue",
};

export default async function ShopServicesPage() {
  const session = await requireShopSession();
  const [services, categoryRef] = await Promise.all([
    listServicesByShop(session.shopId),
    getShopCategoryRef(session.shopId),
  ]);
  const presets = categoryRef
    ? await listActivePresetsByCategory(categoryRef.id)
    : [];

  return (
    <div className="p-4 md:p-12 max-w-[1280px] mx-auto w-full">
      <ServiceManager
        services={services}
        presets={presets}
        categoryName={categoryRef?.name ?? null}
      />
    </div>
  );
}
