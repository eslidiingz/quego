import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/layout/PageHeader";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const supabase = getSupabaseAdmin();
  const [
    { count: categoryCount },
    { count: activeCategoryCount },
    { count: presetCount },
    { count: approvedShops },
  ] = await Promise.all([
    supabase.from("shop_categories").select("*", { count: "exact", head: true }),
    supabase
      .from("shop_categories")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true),
    supabase
      .from("category_service_presets")
      .select("*", { count: "exact", head: true }),
    // Self-serve registration: every live shop is `approved`, so the live shop
    // count is just the approved rows.
    supabase
      .from("shops")
      .select("*", { count: "exact", head: true })
      .eq("status", "approved"),
  ]);

  return (
    <div className="p-4 md:p-12 max-w-[1280px] mx-auto w-full space-y-stack-md">
      <PageHeader
        eyebrow="ยินดีต้อนรับ"
        title="ภาพรวมระบบ"
        description="สรุปจำนวนร้าน หมวดหมู่ และบริการ preset ในระบบ"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <DashboardCard
          href="/admin/shops?status=approved"
          icon="storefront"
          tone="primary"
          value={approvedShops ?? 0}
          label="ร้านที่เปิดให้บริการ"
        />
        <DashboardCard
          href="/admin/categories"
          icon="category"
          tone="primary"
          value={categoryCount ?? 0}
          label={`หมวดหมู่ทั้งหมด (${activeCategoryCount ?? 0} เปิดใช้งาน)`}
        />
        <DashboardCard
          href="/admin/presets"
          icon="stacks"
          tone="secondary"
          value={presetCount ?? 0}
          label="บริการ preset ทั้งหมด"
        />
      </div>
    </div>
  );
}

function DashboardCard({
  href,
  icon,
  tone,
  value,
  label,
  accent,
}: {
  href: string;
  icon: string;
  tone: "primary" | "secondary";
  value: number;
  label: string;
  accent?: React.ReactNode;
}) {
  const iconTint =
    tone === "primary"
      ? "bg-primary-container/10 text-primary"
      : "bg-secondary-container/30 text-secondary";
  return (
    <Link
      href={href}
      className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm hover:shadow-luxury transition-all p-6 group flex flex-col gap-3"
    >
      <div className="flex items-center justify-between">
        <span className={`p-2 rounded-lg ${iconTint}`}>
          <Icon name={icon} />
        </span>
        <Icon
          name="arrow_forward"
          className="text-on-surface-variant group-hover:text-primary group-hover:translate-x-1 transition-all"
        />
      </div>
      <div>
        <p className="text-display-lg-mobile font-bold text-on-background leading-tight">
          {value}
        </p>
        <p className="text-label-md text-on-surface-variant mt-1">{label}</p>
      </div>
      {accent ? <div>{accent}</div> : null}
    </Link>
  );
}
