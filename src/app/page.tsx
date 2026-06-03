import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { PublicShopCard } from "@/components/booking/PublicShopCard";
import { SiteAuthLink } from "@/components/layout/SiteAuthLink";
import { listPublicShopsByCategory } from "@/lib/services/shops";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "LuxeQueue — ค้นหาร้านและจองคิวระดับพรีเมียม",
  description:
    "ค้นหาร้านในระบบ LuxeQueue และจองคิวล่วงหน้าเพื่อยกระดับการรอคอยของคุณ",
};

export default async function HomePage() {
  const groups = await listPublicShopsByCategory();

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <SiteHeader />

      <section className="max-w-[1280px] mx-auto w-full px-4 md:px-12 pt-stack-lg">
        <div className="text-center max-w-2xl mx-auto">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary-container/30 text-on-secondary-container text-label-sm uppercase tracking-widest mb-3">
            <Icon name="workspace_premium" size={16} />
            สำหรับลูกค้า
          </span>
          <h1 className="font-display text-headline-lg text-on-background mb-2">
            ค้นพบร้านที่ใช่ จองคิวสะดวก
          </h1>
          <p className="text-body-md text-on-surface-variant">
            เลือกร้านจากหมวดหมู่ที่คุณสนใจ และดูระยะเวลาที่จะใช้บริการได้ทันที
          </p>
        </div>
      </section>

      <div className="flex-1 max-w-[1280px] mx-auto w-full px-4 md:px-12 py-stack-lg space-y-stack-lg">
        {groups.length === 0 ? (
          <EmptyState />
        ) : (
          groups.map(({ category, shops }) => (
            <CategorySection key={category.id} category={category} shops={shops} />
          ))
        )}
      </div>

      <SiteFooter />
    </main>
  );
}

function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 bg-surface/95 backdrop-blur border-b border-outline-variant">
      <div className="max-w-[1280px] mx-auto px-4 md:px-12 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Icon name="spa" className="text-primary" size={28} />
          <span className="font-display font-bold text-headline-md text-primary tracking-tight">
            LuxeQueue
          </span>
        </Link>
        <nav className="flex items-center gap-4">
          <Link
            href="/shops/register"
            className="text-label-md text-on-surface-variant hover:text-primary transition-colors hidden sm:inline-flex items-center gap-1"
          >
            <Icon name="store" size={16} />
            สมัครเป็นร้าน
          </Link>
          <SiteAuthLink />
        </nav>
      </div>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-outline-variant bg-surface-container-low">
      <div className="max-w-[1280px] mx-auto px-4 md:px-12 py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-label-sm text-on-surface-variant">
        <span>
          © {new Date().getFullYear()} LuxeQueue Premium Concierge
        </span>
        <nav className="flex gap-4">
          <Link href="/shops/register" className="hover:text-primary transition-colors">
            สมัครเป็นร้าน
          </Link>
          <SiteAuthLink variant="footer" />
        </nav>
      </div>
    </footer>
  );
}

function CategorySection({
  category,
  shops,
}: {
  category: { id: string; name: string; icon: string | null };
  shops: { id: string; name: string; description: string | null; address: string | null; service_duration_minutes: number }[];
}) {
  return (
    <section aria-labelledby={`cat-${category.id}`}>
      <header className="flex items-center gap-3 mb-4">
        <span className="w-10 h-10 rounded-xl bg-primary-container/15 text-primary flex items-center justify-center shrink-0">
          <Icon name={category.icon ?? "category"} />
        </span>
        <h2
          id={`cat-${category.id}`}
          className="font-display text-headline-md text-on-background"
        >
          {category.name}
        </h2>
        <span className="text-label-md text-on-surface-variant">
          ({shops.length} ร้าน)
        </span>
      </header>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
        {shops.map((shop) => (
          <PublicShopCard
            key={shop.id}
            id={shop.id}
            name={shop.name}
            description={shop.description}
            address={shop.address}
            serviceDurationMinutes={shop.service_duration_minutes}
            categoryIcon={category.icon}
          />
        ))}
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
        เป็นคนแรกที่สมัครและเปิดร้านบน LuxeQueue
      </p>
      <Link
        href="/shops/register"
        className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 rounded-full bg-primary text-on-primary text-label-md font-semibold hover:opacity-90 transition-opacity"
      >
        <Icon name="add_business" size={18} />
        สมัครเป็นร้าน
      </Link>
    </div>
  );
}
