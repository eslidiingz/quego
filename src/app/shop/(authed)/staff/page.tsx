import { requireShopSession } from "@/lib/auth/shop-session-server";
import { listStaffByShop } from "@/lib/services/staff";
import { listActiveServicesByShop } from "@/lib/services/services";
import { StaffManager } from "./StaffManager";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "พนักงาน · queva",
};

export default async function ShopStaffPage() {
  const session = await requireShopSession();
  const [staff, services] = await Promise.all([
    listStaffByShop(session.shopId),
    listActiveServicesByShop(session.shopId),
  ]);

  return (
    <div className="p-4 md:p-12 max-w-[1280px] mx-auto w-full">
      <StaffManager staff={staff} services={services} />
    </div>
  );
}
