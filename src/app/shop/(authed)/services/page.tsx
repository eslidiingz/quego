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
    <div className="p-4 md:p-12 max-w-[1280px] mx-auto w-full space-y-stack-lg">
      <header>
        <p className="text-label-md text-secondary uppercase tracking-widest mb-1">
          จัดการบริการ
        </p>
        <h1 className="font-display text-headline-lg text-on-background">บริการ</h1>
        <p className="text-on-surface-variant mt-2">
          เพิ่มและจัดการบริการของร้าน เช่น ตัดผม ทำสี ดัดวอลลุ่ม
          ระยะเวลาของแต่ละบริการกำหนดรอบเวลาที่ลูกค้าจองได้
        </p>
      </header>

      <ServiceManager services={services} />
    </div>
  );
}
