import { requireShopSession } from "@/lib/auth/shop-session-server";
import { listStaffByShop } from "@/lib/services/staff";
import { listActiveServicesByShop } from "@/lib/services/services";
import { StaffManager } from "./StaffManager";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "พนักงาน · LuxeQueue",
};

export default async function ShopStaffPage() {
  const session = await requireShopSession();
  const [staff, services] = await Promise.all([
    listStaffByShop(session.shopId),
    listActiveServicesByShop(session.shopId),
  ]);

  return (
    <div className="p-4 md:p-12 max-w-[1280px] mx-auto w-full space-y-stack-lg">
      <header>
        <p className="text-label-md text-secondary uppercase tracking-widest mb-1">
          จัดการทีมงาน
        </p>
        <h1 className="font-display text-headline-lg text-on-background">พนักงาน</h1>
        <p className="text-on-surface-variant mt-2">
          เพิ่มและจัดการพนักงานของร้าน จำนวนพนักงานที่เปิดใช้งานกำหนดว่ารับได้กี่คิวพร้อมกันในแต่ละช่วงเวลา
        </p>
      </header>

      <StaffManager staff={staff} services={services} />
    </div>
  );
}
