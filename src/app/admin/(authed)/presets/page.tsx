import Link from "next/link";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  listPresetsByCategory,
  countPresetsByCategory,
} from "@/lib/services/service-presets";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/layout/PageHeader";
import { CategoryTabs, type PresetCategoryTab } from "./CategoryTabs";
import { PresetsManager } from "./PresetsManager";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "บริการ preset · quego Admin",
};

type SearchParams = Promise<{ category?: string }>;

export default async function PresetsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { category: categoryParam } = await searchParams;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("shop_categories")
    .select("id, name, slug, icon")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    // Log the real DB detail server-side; keep the rendered message generic so
    // schema/constraint names aren't leaked into the page.
    console.error("PresetsPage: shop_categories load error:", error);
    return (
      <div className="p-4 md:p-12 max-w-[1280px] mx-auto w-full">
        <div className="rounded-lg border border-error/30 bg-error-container/30 text-error px-4 py-3">
          โหลดข้อมูลหมวดหมู่ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง
        </div>
      </div>
    );
  }

  const categories: PresetCategoryTab[] = data ?? [];

  return (
    <div className="p-4 md:p-12 max-w-[1280px] mx-auto w-full space-y-stack-md">
      <PageHeader
        eyebrow="จัดการ Taxonomy"
        title="บริการ preset"
        description="ชุดบริการสำเร็จรูปของแต่ละหมวดหมู่ร้าน ร้านในหมวดนั้นเลือกไปเพิ่มเป็นบริการของตัวเองได้ในคลิกเดียว"
      />

      {categories.length === 0 ? (
        <NoCategories />
      ) : (
        <PresetsForCategory
          categories={categories}
          categoryParam={categoryParam}
        />
      )}
    </div>
  );
}

async function PresetsForCategory({
  categories,
  categoryParam,
}: {
  categories: PresetCategoryTab[];
  categoryParam: string | undefined;
}) {
  const active =
    categories.find((c) => c.slug === categoryParam) ?? categories[0];

  const [presets, counts] = await Promise.all([
    listPresetsByCategory(active.id),
    countPresetsByCategory(),
  ]);

  return (
    <>
      <CategoryTabs
        categories={categories}
        activeSlug={active.slug}
        counts={counts}
      />
      <PresetsManager
        key={active.id}
        categoryId={active.id}
        categoryName={active.name}
        presets={presets}
      />
    </>
  );
}

function NoCategories() {
  return (
    <div className="bg-surface-container-lowest border border-dashed border-outline-variant rounded-xl p-12 text-center space-y-3">
      <div className="w-16 h-16 mx-auto rounded-full bg-surface-container-high text-on-surface-variant flex items-center justify-center">
        <Icon name="category" size={32} />
      </div>
      <h2 className="font-display text-headline-md text-on-surface">
        ยังไม่มีหมวดหมู่ร้าน
      </h2>
      <p className="text-body-md text-on-surface-variant max-w-md mx-auto">
        ต้องมีหมวดหมู่ร้านก่อน จึงจะสร้างบริการ preset ของหมวดนั้นได้
      </p>
      <Link
        href="/admin/categories"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-on-primary font-bold text-label-md hover:opacity-90 transition-opacity"
      >
        <Icon name="category" size={18} />
        ไปที่หมวดหมู่ร้าน
      </Link>
    </div>
  );
}
