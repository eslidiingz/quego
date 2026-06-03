import { redirect } from "next/navigation";
import { requireShopSession } from "@/lib/auth/shop-session-server";
import { getShopById, listActiveCategories } from "@/lib/services/shops";
import { listBusinessHours } from "@/lib/services/business-hours";
import { Chip } from "@/components/ui/Chip";
import { ChangePinForm } from "@/components/ui/ChangePinForm";
import { EditProfileForm } from "./EditProfileForm";
import { BusinessHoursForm } from "./BusinessHoursForm";
import { ServiceDurationForm } from "./ServiceDurationForm";
import { changeShopPinAction } from "./actions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "ข้อมูลร้าน · LuxeQueue",
};

export default async function ShopProfilePage() {
  const session = await requireShopSession();
  const [shop, categories, hours] = await Promise.all([
    getShopById(session.shopId),
    listActiveCategories(),
    listBusinessHours(session.shopId),
  ]);

  if (!shop) {
    // Shouldn't happen if session is valid, but keep a graceful path.
    redirect("/login?tab=shop&notice=session-expired");
  }

  return (
    <div className="p-4 md:p-12 max-w-3xl mx-auto w-full space-y-stack-lg">
      <header className="space-y-2">
        <p className="text-label-md text-secondary uppercase tracking-widest">
          จัดการร้าน
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="font-display text-headline-lg text-on-background">
            ข้อมูลร้าน
          </h1>
          {shop.status === "approved" ? (
            <Chip variant="premium" size="sm">เปิดให้บริการ</Chip>
          ) : null}
        </div>
        <p className="text-body-md text-on-surface-variant">
          แก้ไขข้อมูลร้านและเวลาทำการของคุณ การเปลี่ยนแปลงจะมีผลทันทีในหน้าค้นหาของลูกค้า
        </p>
      </header>

      <EditProfileForm shop={shop} categories={categories} />

      <div>
        <h2 className="font-display text-headline-md text-on-surface mb-1">
          ระยะเวลาให้บริการ
        </h2>
        <p className="text-body-md text-on-surface-variant mb-4">
          ใช้สำหรับคำนวณเวลารอของลูกค้าในระบบจองคิว
        </p>
        <ServiceDurationForm defaultMinutes={shop.service_duration_minutes} />
      </div>

      <div>
        <h2 className="font-display text-headline-md text-on-surface mb-1">
          เวลาทำการ
        </h2>
        <p className="text-body-md text-on-surface-variant mb-4">
          ตั้งเวลาเปิด-ปิดของร้านในแต่ละวัน ลูกค้าจะเห็นเฉพาะวันที่เปิดทำการ
        </p>
        <BusinessHoursForm hours={hours} shopId={session.shopId} />
      </div>

      <ChangePinForm action={changeShopPinAction} />
    </div>
  );
}
