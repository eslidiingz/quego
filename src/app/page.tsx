import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { ShopDiscovery } from "@/components/booking/ShopDiscovery";
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingHero } from "@/components/landing/LandingHero";
import { ValueProps } from "@/components/landing/ValueProps";
import { HomeFAQ } from "@/components/landing/HomeFAQ";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { CustomerBottomNav } from "@/components/layout/CustomerBottomNav";
import { listPublicShopsByCategory } from "@/lib/services/shops";
import { shouldShowCustomerBottomNav } from "@/lib/auth/customer-bottom-nav";
import { cn } from "@/lib/cn";

export const dynamic = "force-dynamic";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://quego.app";

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Quego — ไม่ต้องรอเก้อ แค่กดจอง",
  description:
    "จองคิวร้านและธุรกิจบริการทุกประเภททั่วไทย ดูคิวเรียลไทม์ กดจองล่วงหน้า ไม่ต้องไปนั่งรอ",
  keywords: [
    "จองคิว",
    "จองคิวร้านเสริมสวย",
    "จองคิวออนไลน์",
    "ดูคิวเรียลไทม์",
    "จองคิวคลินิก",
    "จองคิวร้านอาหาร",
    "quego",
  ],
  openGraph: {
    type: "website",
    locale: "th_TH",
    siteName: "Quego",
    title: "Quego — ไม่ต้องรอเก้อ แค่กดจอง",
    description:
      "จองคิวร้านและธุรกิจบริการทุกประเภททั่วไทย ดูคิวเรียลไทม์ กดจองล่วงหน้า ไม่ต้องไปนั่งรอ",
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "Quego — ไม่ต้องรอเก้อ แค่กดจอง",
    description:
      "จองคิวร้านและธุรกิจบริการทุกประเภททั่วไทย ดูคิวเรียลไทม์ กดจองล่วงหน้า",
  },
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

      {/* Real, bookable shops — the hero search + category pills jump here.
         Kept close to the hero so the first shop is near the fold (customers
         come to find a shop, not to read marketing). */}
      <section
        id="shops"
        className="scroll-mt-20 px-4 md:px-12 pt-8 md:pt-10"
      >
        <div className="max-w-[1180px] mx-auto w-full mb-6">
          <p className="text-label-sm font-medium uppercase tracking-wide text-primary">
            ค้นหาร้าน
          </p>
          <h2 className="font-headline font-semibold text-headline-lg sm:text-display-lg tracking-tight text-on-background mt-1">
            {sectionTitle}
          </h2>
          <p className="text-body-sm text-on-surface-variant mt-1">
            เลือกร้าน เช็กคิว แล้วจองได้ในไม่กี่วินาที
          </p>
        </div>
      </section>

      <div className="flex-1">
        {groups.length === 0 ? (
          <div className="px-4 md:px-12 py-12">
            <div className="max-w-[1180px] mx-auto w-full">
              <EmptyState />
            </div>
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

      <ValueProps />
      <HowItWorks />
      <HomeFAQ />
      <OwnerCrossLink />
      <LandingFooter />

      {showCustomerNav ? <CustomerBottomNav /> : null}
    </main>
  );
}

/**
 * Thin supply-side cross-link — the customer home's only owner-facing nudge.
 * One line instead of a full ForShopOwners section, so it never breaks the
 * customer's discovery → book flow; the real pitch lives on /business.
 */
function OwnerCrossLink() {
  return (
    <section className="px-4 md:px-12 py-6">
      <div className="max-w-[1180px] mx-auto w-full">
        <Link
          href="/business"
          className="group flex items-center justify-between gap-4 rounded-xl border border-outline-variant bg-surface-container-low px-5 py-4 hover:border-primary transition-colors"
        >
          <span className="flex items-center gap-3 min-w-0">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon name="storefront" size={20} />
            </span>
            <span className="min-w-0">
              <span className="block text-label-lg font-semibold text-on-surface">
                เป็นเจ้าของร้าน?
              </span>
              <span className="block text-label-md text-on-surface-variant">
                เปิดคิวออนไลน์ฟรี สมัครเสร็จใช้ได้ทันที
              </span>
            </span>
          </span>
          <span className="inline-flex items-center gap-1 shrink-0 text-label-md font-semibold text-primary">
            เปิดร้าน
            <Icon
              name="arrow_forward"
              size={18}
              className="transition-transform group-hover:translate-x-0.5"
            />
          </span>
        </Link>
      </div>
    </section>
  );
}

function EmptyState() {
  return (
    <div className="bg-surface-container-lowest border border-dashed border-outline-variant rounded-xl p-12 text-center max-w-2xl mx-auto">
      <div className="w-16 h-16 mx-auto rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant mb-4">
        <Icon name="storefront" size={32} />
      </div>
      <p className="text-body-md text-on-surface">ยังไม่มีร้านในระบบ</p>
      <p className="text-label-md text-on-surface-variant mt-1">
        เป็นคนแรกที่สมัครและเปิดร้านบน Quego
      </p>
      <Link
        href="/business"
        className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 rounded-full bg-secondary text-on-secondary text-label-lg font-semibold hover:bg-secondary-fixed-variant transition-colors"
      >
        <Icon name="add_business" size={18} />
        สมัครเป็นร้าน
      </Link>
    </div>
  );
}
