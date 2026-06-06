import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { CategoriesTable, type CategoryRow } from "./CategoriesTable";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "หมวดหมู่ร้าน · queva Admin",
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
    <div className="p-4 md:p-12 max-w-[1280px] mx-auto w-full space-y-stack-lg">
      <div>
        <p className="text-label-md text-secondary uppercase tracking-widest mb-1">
          จัดการ Taxonomy
        </p>
        <h1 className="font-display text-headline-lg text-on-background">
          หมวดหมู่ร้าน
        </h1>
        <p className="text-on-surface-variant mt-2">
          เพิ่ม แก้ไข หรือปิดการใช้งานหมวดหมู่ที่ใช้ในขั้นตอนสมัครร้านและตัวกรองค้นหา
        </p>
      </div>
      <CategoriesTable rows={rows} />
    </div>
  );
}
