import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { ShopDiscovery } from "@/components/booking/ShopDiscovery";
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingHero } from "@/components/landing/LandingHero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { CustomerBottomNav } from "@/components/layout/CustomerBottomNav";
import { listPublicShopsByCategory } from "@/lib/services/shops";
import { shouldShowCustomerBottomNav } from "@/lib/auth/customer-bottom-nav";
import { cn } from "@/lib/cn";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "queva — ไม่ต้องรอเก้อ แค่กดจอง",
  description:
    "จองคิวร้านบริการความงามและสุขภาพทั่วไทย ดูคิวเรียลไทม์ กดจองล่วงหน้า ไม่ต้องไปนั่งรอ",
};

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string | string[];
    cat?: string | string[];
    province?: string | string[];
    district?: string | string[];
    subdistrict?: string | string[];
  }>;
}) {
  const [groups, params, showCustomerNav] = await Promise.all([
    listPublicShopsByCategory(),
    searchParams,
    shouldShowCustomerBottomNav(),
  ]);

  const first = (v?: string | string[]) => (Array.isArray(v) ? v[0] : v ?? "");
  const initialQuery = first(params.q);
  const initialCategoryId = first(params.cat);
  const initialProvince = first(params.province);
  const initialDistrict = first(params.district);
  const initialSubdistrict = first(params.subdistrict);
  const shopCount = groups.reduce((sum, g) => sum + g.shops.length, 0);
  const categories = groups.map((g) => g.category);

  const areaLabel = initialSubdistrict
    ? `${initialSubdistrict}, ${initialDistrict}, ${initialProvince}`
    : initialDistrict
      ? `${initialDistrict}, ${initialProvince}`
      : initialProvince;
  const sectionTitle = initialProvince ? `ร้านใน ${areaLabel}` : "ร้านใกล้คุณ";

  return (
    <main
      className={cn(
        "min-h-screen flex flex-col bg-background",
        // Reserve room for the mobile customer tab bar (hidden on sm:+).
        showCustomerNav &&
          "pb-[calc(4rem+env(safe-area-inset-bottom))] sm:pb-0",
      )}
    >
      <LandingNav />
      <LandingHero
        shopCount={shopCount}
        categoryCount={groups.length}
        categories={categories}
        initialProvince={initialProvince}
        initialDistrict={initialDistrict}
        initialSubdistrict={initialSubdistrict}
      />

      {/* Real, bookable shops — the hero search + category pills jump here */}
      <section
        id="shops"
        className="scroll-mt-20 max-w-[1180px] mx-auto w-full px-4 md:px-12 pt-12 md:pt-16"
      >
        <div className="mb-6">
          <h2 className="font-headline font-semibold text-[24px] sm:text-[30px] tracking-tight text-on-background">
            {sectionTitle}
          </h2>
          <p className="text-body-sm text-on-surface-variant mt-1">
            เลือกร้าน เช็กคิว แล้วจองได้ในไม่กี่วินาที
          </p>
        </div>
      </section>

      <div className="flex-1">
        {groups.length === 0 ? (
          <div className="max-w-[1180px] mx-auto w-full px-4 md:px-12 py-12">
            <EmptyState />
          </div>
        ) : (
          <ShopDiscovery
            key={`${initialProvince}|${initialDistrict}|${initialSubdistrict}|${initialQuery}|${initialCategoryId}`}
            groups={groups}
            initialQuery={initialQuery}
            initialCategoryId={initialCategoryId}
            initialProvince={initialProvince}
            initialDistrict={initialDistrict}
            initialSubdistrict={initialSubdistrict}
          />
        )}
      </div>

      <HowItWorks />
      <LandingFooter />

      {showCustomerNav ? <CustomerBottomNav /> : null}
    </main>
  );
}

function EmptyState() {
  return (
    <div className="bg-surface-container-lowest border border-dashed border-outline-variant rounded-2xl p-12 text-center max-w-2xl mx-auto">
      <div className="w-16 h-16 mx-auto rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant mb-4">
        <Icon name="storefront" size={32} />
      </div>
      <p className="text-body-md text-on-surface">ยังไม่มีร้านในระบบ</p>
      <p className="text-label-md text-on-surface-variant mt-1">
        เป็นคนแรกที่สมัครและเปิดร้านบน queva
      </p>
      <Link
        href="/shops/register"
        className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 rounded-full bg-secondary text-on-secondary text-label-lg font-semibold hover:bg-secondary-fixed-variant transition-colors"
      >
        <Icon name="add_business" size={18} />
        สมัครเป็นร้าน
      </Link>
    </div>
  );
}
