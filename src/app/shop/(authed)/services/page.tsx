import { requireShopSession } from "@/lib/auth/shop-session-server";
import { listServicesByShop } from "@/lib/services/services";
import { ServiceManager } from "./ServiceManager";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "บริการ · LuxeQueue",
};

export default async function ShopServicesPage() {
  const session = await requireShopSession();
  const services = await listServicesByShop(session.shopId);

  return (
    <div className="p-4 md:p-12 max-w-[1280px] mx-auto w-full">
      <ServiceManager services={services} />
    </div>
  );
}
