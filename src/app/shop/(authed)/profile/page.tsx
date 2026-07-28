import { redirect } from "next/navigation";
import { requireShopSession } from "@/lib/auth/shop-session-server";
import { getShopById, listActiveCategories } from "@/lib/services/shops";
import { listBusinessHours } from "@/lib/services/business-hours";
import { Chip } from "@/components/ui/Chip";
import { ChangePinForm } from "@/components/ui/ChangePinForm";
import { FlashToast } from "@/components/ui/FlashToast";
import { PageHeader } from "@/components/layout/PageHeader";
import { TourHelpButton } from "@/components/tour/TourHelpButton";
import { TOUR_ANCHORS } from "@/lib/tour/anchors";
import { profileTourId } from "@/lib/tour/shop-tours";
import { ProfileTabs, type ProfileTab } from "./ProfileTabs";
import { EditProfileForm } from "./EditProfileForm";
import { ShopImagesForm } from "./ShopImagesForm";
import { BusinessHoursForm } from "./BusinessHoursForm";
import { changeShopPinAction } from "./actions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "ข้อมูลร้าน · Quego",
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

  return (
    <div className="p-4 md:p-12 max-w-3xl mx-auto w-full space-y-stack-md">
      <FlashToast notice={notice} />
      <PageHeader
        eyebrow="จัดการร้าน"
        title="ข้อมูลร้าน"
        badge={<Chip variant="premium" size="sm">เปิดให้บริการ</Chip>}
        description={TAB_DESCRIPTIONS[tab]}
        help={<TourHelpButton tourId={profileTourId(tab)} />}
      />

      <ProfileTabs active={tab} />

      {/* The three tab bodies are anchored from here rather than inside each
          form: they all return fragments, so there is no single root element of
          theirs for the tour to point at. */}
      {tab === "info" && (
        <div className="space-y-stack-md">
          <div data-tour={TOUR_ANCHORS.profileImages}>
            <ShopImagesForm shop={shop} />
          </div>
          <EditProfileForm shop={shop} categories={categories} />
        </div>
      )}
      {tab === "hours" && (
        <div data-tour={TOUR_ANCHORS.profileHours}>
          <BusinessHoursForm hours={hours} shopId={session.shopId} />
        </div>
      )}
      {tab === "security" && (
        <div data-tour={TOUR_ANCHORS.profilePin}>
          <ChangePinForm action={changeShopPinAction} />
        </div>
      )}
    </div>
  );
}
