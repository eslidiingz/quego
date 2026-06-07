import { redirect } from "next/navigation";
import { requireShopSession } from "@/lib/auth/shop-session-server";
import { getShopById, listActiveCategories } from "@/lib/services/shops";
import { listBusinessHours } from "@/lib/services/business-hours";
import { Chip } from "@/components/ui/Chip";
import { ChangePinForm } from "@/components/ui/ChangePinForm";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProfileTabs, type ProfileTab } from "./ProfileTabs";
import { EditProfileForm } from "./EditProfileForm";
import { BusinessHoursForm } from "./BusinessHoursForm";
import { changeShopPinAction } from "./actions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "ข้อมูลร้าน · queva",
};

function parseTab(raw: string | undefined): ProfileTab {
  if (raw === "hours" || raw === "security") return raw;
  return "info";
}

const TAB_DESCRIPTIONS: Record<ProfileTab, string> = {
  info: "แก้ไขรายละเอียดร้าน ประเภทธุรกิจ ที่อยู่ และข้อมูลผู้ติดต่อ",
  hours: "ตั้งเวลาเปิด-ปิดของร้านในแต่ละวัน ลูกค้าจะเห็นเฉพาะวันที่เปิดทำการ",
  security: "เปลี่ยนรหัส PIN ที่ใช้เข้าสู่ระบบ",
};

type SearchParams = Promise<{ tab?: string }>;

export default async function ShopProfilePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await requireShopSession();
  const { tab: rawTab } = await searchParams;
  const tab = parseTab(rawTab);

  const [shop, categories, hours] = await Promise.all([
    getShopById(session.shopId),
    listActiveCategories(),
    listBusinessHours(session.shopId),
  ]);

  if (!shop) {
    redirect("/login?tab=shop&notice=session-expired");
  }

  return (
    <div className="p-4 md:p-12 max-w-3xl mx-auto w-full space-y-stack-md">
      <PageHeader
        eyebrow="จัดการร้าน"
        title="ข้อมูลร้าน"
        badge={
          shop.status === "approved" ? (
            <Chip variant="premium" size="sm">เปิดให้บริการ</Chip>
          ) : null
        }
        description={TAB_DESCRIPTIONS[tab]}
      />

      <ProfileTabs active={tab} />

      {tab === "info" && (
        <EditProfileForm shop={shop} categories={categories} />
      )}
      {tab === "hours" && (
        <BusinessHoursForm hours={hours} shopId={session.shopId} />
      )}
      {tab === "security" && (
        <ChangePinForm action={changeShopPinAction} />
      )}
    </div>
  );
}
