import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { ShopDiscovery } from "@/components/booking/ShopDiscovery";
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingHero } from "@/components/landing/LandingHero";
import { FeaturedQueue } from "@/components/landing/FeaturedQueue";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { listPublicShopsByCategory } from "@/lib/services/shops";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "queva — ไม่ต้องรอเก้อ แค่กดจอง",
  description:
    "จองคิวร้านบริการความงามและสุขภาพทั่วไทย ดูคิวเรียลไทม์ กดจองล่วงหน้า ไม่ต้องไปนั่งรอ",
};

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const [groups, params] = await Promise.all([
    listPublicShopsByCategory(),
    searchParams,
  ]);

  const initialQuery = Array.isArray(params.q) ? params.q[0] : params.q ?? "";
  const shopCount = groups.reduce((sum, g) => sum + g.shops.length, 0);

  return (
    <main className="min-h-screen flex flex-col bg-background">
      <LandingNav />
      <LandingHero shopCount={shopCount} categoryCount={groups.length} />
      <FeaturedQueue />

      {/* Real, bookable shops — the hero search + category pills jump here */}
      <section
        id="shops"
        className="scroll-mt-20 max-w-[1180px] mx-auto w-full px-4 md:px-12 pt-12 md:pt-16"
      >
        <div className="mb-6">
          <h2 className="font-headline font-semibold text-[24px] sm:text-[30px] tracking-tight text-on-background">
            ร้านใกล้คุณ
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
          <ShopDiscovery groups={groups} initialQuery={initialQuery} />
        )}
      </div>

      <HowItWorks />
      <LandingFooter />
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
