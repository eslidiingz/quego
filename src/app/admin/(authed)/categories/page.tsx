import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/layout/PageHeader";
import { CategoriesTable, type CategoryRow } from "./CategoriesTable";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "หมวดหมู่ร้าน · quego Admin",
};

export default async function CategoriesPage() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("shop_categories")
    .select("id, name, slug, icon, sort_order, is_active, updated_at")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    return (
      <div className="p-4 md:p-12 max-w-[1280px] mx-auto w-full">
        <div className="rounded-lg border border-error/30 bg-error-container/30 text-error px-4 py-3">
          โหลดข้อมูลหมวดหมู่ไม่สำเร็จ: {error.message}
        </div>
      </div>
    );
  }

  const rows: CategoryRow[] = data ?? [];

  return (
    <div className="p-4 md:p-12 max-w-[1280px] mx-auto w-full space-y-stack-md">
      <PageHeader
        eyebrow="จัดการ Taxonomy"
        title="หมวดหมู่ร้าน"
        description="เพิ่ม แก้ไข หรือปิดการใช้งานหมวดหมู่ที่ใช้ในขั้นตอนสมัครร้านและตัวกรองค้นหา"
      />
      <CategoriesTable rows={rows} />
    </div>
  );
}
