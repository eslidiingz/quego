import { listActiveCategories, listShops } from "@/lib/services/shops";
import { FlashToast } from "@/components/ui/FlashToast";
import { PageHeader } from "@/components/layout/PageHeader";
import { ShopsBrowser } from "./ShopsBrowser";
import { StatusTabs, type TabKey } from "./StatusTabs";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "จัดการร้าน · Quego Admin",
};

function parseTab(raw: string | undefined): TabKey {
  if (raw === "all") return "all";
  // Default to the live (approved) set — the only shops that matter day to day.
  return "approved";
}

type SearchParams = Promise<{ status?: string; notice?: string }>;

export default async function AdminShopsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { status, notice } = await searchParams;
  const tab = parseTab(status);

  // One read of every shop; derive the tab counts and the visible rows in
  // memory. With no moderation there are only two buckets (all vs approved),
  // so a single fetch is cheaper than a separate count query.
  const [allRows, categories] = await Promise.all([
    listShops(),
    listActiveCategories(),
  ]);
  const approvedRows = allRows.filter((s) => s.status === "approved");
  const counts = { all: allRows.length, approved: approvedRows.length };
  const rows = tab === "all" ? allRows : approvedRows;

  return (
    <div className="p-4 md:p-12 max-w-[1280px] mx-auto w-full space-y-stack-md">
      <FlashToast notice={notice} />
      <PageHeader
        eyebrow="จัดการสมาชิก"
        title="จัดการร้านในระบบ"
        description="ดูร้านที่เปิดให้บริการในระบบ ค้นหา และแก้ไขข้อมูลร้านได้ที่นี่"
      />

      <StatusTabs active={tab} counts={counts} />

      {/* key={tab} resets client filter state on status switch — App Router
          soft-nav would otherwise keep the previous tab's search/filters. */}
      <ShopsBrowser key={tab} rows={rows} categories={categories} />
    </div>
  );
}
