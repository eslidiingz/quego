import {
  countShopsByStatus,
  listActiveCategories,
  listShops,
  type ShopStatus,
} from "@/lib/services/shops";
import { FlashToast } from "@/components/ui/FlashToast";
import { PageHeader } from "@/components/layout/PageHeader";
import { ShopsList } from "./ShopsList";
import { StatusTabs, type TabKey } from "./StatusTabs";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "จัดการร้าน · queva Admin",
};

const VALID_STATUSES: Record<ShopStatus, true> = {
  pending: true,
  approved: true,
  rejected: true,
  suspended: true,
};

function parseTab(raw: string | undefined): TabKey {
  if (raw && raw in VALID_STATUSES) return raw as ShopStatus;
  if (raw === "all") return "all";
  return "pending"; // sensible default: admin lands on what needs action
}

type SearchParams = Promise<{ status?: string; notice?: string }>;

export default async function AdminShopsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { status, notice } = await searchParams;
  const tab = parseTab(status);

  const [rows, counts, categories] = await Promise.all([
    listShops({ status: tab === "all" ? undefined : tab }),
    countShopsByStatus(),
    listActiveCategories(),
  ]);

  return (
    <div className="p-4 md:p-12 max-w-[1280px] mx-auto w-full space-y-stack-md">
      <FlashToast notice={notice} />
      <PageHeader
        eyebrow="จัดการสมาชิก"
        title="จัดการร้านในระบบ"
        description="อนุมัติหรือปฏิเสธคำขอสมัครเป็นร้านในระบบ และดูสถานะของร้านที่ผ่านการตรวจสอบแล้ว"
      />

      <StatusTabs active={tab} counts={counts} />

      <ShopsList rows={rows} categories={categories} />
    </div>
  );
}
