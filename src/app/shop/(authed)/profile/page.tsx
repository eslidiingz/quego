import { redirect } from "next/navigation";
import { requireShopSession } from "@/lib/auth/shop-session-server";
import { getShopById, listActiveCategories } from "@/lib/services/shops";
import { listBusinessHours } from "@/lib/services/business-hours";
import { getShopLineStatus } from "@/lib/services/shop-line";
import { Chip } from "@/components/ui/Chip";
import { ChangePinForm } from "@/components/ui/ChangePinForm";
import { FlashToast } from "@/components/ui/FlashToast";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProfileTabs, type ProfileTab } from "./ProfileTabs";
import { EditProfileForm } from "./EditProfileForm";
import { BusinessHoursForm } from "./BusinessHoursForm";
import { ShopLineCard } from "./ShopLineCard";
import { changeShopPinAction } from "./actions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "ข้อมูลร้าน · Quego",
};

function parseTab(raw: string | undefined): ProfileTab {
  if (raw === "hours" || raw === "notifications" || raw === "security") return raw;
  return "info";
}

const TAB_DESCRIPTIONS: Record<ProfileTab, string> = {
  info: "แก้ไขรายละเอียดร้าน ประเภทธุรกิจ ที่อยู่ และข้อมูลผู้ติดต่อ",
  hours: "ตั้งเวลาเปิด-ปิดของร้านในแต่ละวัน ลูกค้าจะเห็นเฉพาะวันที่เปิดทำการ",
  notifications: "เชื่อมต่อ LINE เพื่อรับการแจ้งเตือนของระบบเมื่อมีการจองใหม่",
  security: "เปลี่ยนรหัส PIN ที่ใช้เข้าสู่ระบบ",
};

type SearchParams = Promise<{ tab?: string; notice?: string }>;

export default async function ShopProfilePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await requireShopSession();
  const { tab: rawTab, notice } = await searchParams;
  const tab = parseTab(rawTab);

  const [shop, categories, hours] = await Promise.all([
    getShopById(session.shopId),
    listActiveCategories(),
    listBusinessHours(session.shopId),
  ]);

  if (!shop) {
    redirect("/login?tab=shop&notice=session-expired");
  }

  // LINE status is only needed for the notifications tab — fetch it lazily.
  const lineStatus =
    tab === "notifications"
      ? await getShopLineStatus(session.shopId)
      : null;

  return (
    <div className="p-4 md:p-12 max-w-3xl mx-auto w-full space-y-stack-md">
      <FlashToast notice={notice} />
      <PageHeader
        eyebrow="จัดการร้าน"
        title="ข้อมูลร้าน"
        badge={<Chip variant="premium" size="sm">เปิดให้บริการ</Chip>}
        description={TAB_DESCRIPTIONS[tab]}
      />

      <ProfileTabs active={tab} />

      {tab === "info" && (
        <EditProfileForm shop={shop} categories={categories} />
      )}
      {tab === "hours" && (
        <BusinessHoursForm hours={hours} shopId={session.shopId} />
      )}
      {tab === "notifications" && lineStatus && (
        <ShopLineCard linked={lineStatus.linked} />
      )}
      {tab === "security" && (
        <ChangePinForm action={changeShopPinAction} />
      )}
    </div>
  );
}
