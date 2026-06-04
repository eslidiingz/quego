import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { SiteAuthLink } from "@/components/layout/SiteAuthLink";
import { Chip } from "@/components/ui/Chip";
import { BusinessHoursDisplay } from "@/components/booking/BusinessHoursDisplay";
import { getPublicShopById } from "@/lib/services/shops";
import { getBangkokNow } from "@/lib/time/bangkok";

export const dynamic = "force-dynamic";

type RouteParams = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: RouteParams }) {
  const { id } = await params;
  const shop = await getPublicShopById(id);
  if (!shop) {
    return { title: "ไม่พบร้านที่ต้องการ · LuxeQueue" };
  }
  return {
    title: `${shop.name} · LuxeQueue`,
    description:
      shop.description ?? `จองคิวร้าน ${shop.name} ผ่าน LuxeQueue ได้ทันที`,
  };
}

export default async function ShopDetailPage({
  params,
}: {
  params: RouteParams;
}) {
  const { id } = await params;
  const shop = await getPublicShopById(id);
  if (!shop) notFound();

  const now = getBangkokNow();
  const todayHours = shop.hours.find((h) => h.dayOfWeek === now.dayOfWeek);
  const isOpenNow = Boolean(
    todayHours?.isOpen &&
      todayHours.openTime &&
      todayHours.closeTime &&
      now.timeHHMM >= todayHours.openTime &&
      now.timeHHMM < todayHours.closeTime,
  );

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <SiteHeader />

      <div className="max-w-3xl mx-auto w-full px-4 md:px-6 py-6 space-y-stack-md">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-label-md text-on-surface-variant hover:text-primary transition-colors"
        >
          <Icon name="arrow_back" size={18} />
          กลับหน้าค้นหา
        </Link>

        {/* Hero */}
        <section className="relative overflow-hidden rounded-2xl bg-luxury-gradient text-on-primary shadow-luxury p-6 md:p-10">
          <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
            <span className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center shrink-0">
              <Icon
                name={shop.category.icon ?? "storefront"}
                className="text-on-primary"
                size={40}
              />
            </span>
            <div className="flex-1 space-y-2">
              <p className="text-label-sm uppercase tracking-widest opacity-80">
                {shop.category.name}
              </p>
              <h1 className="font-display text-headline-lg leading-tight">
                {shop.name}
              </h1>
              <div className="flex items-center gap-2 flex-wrap pt-1">
                {isOpenNow ? (
                  <Chip variant="success" size="sm" pulse>
                    เปิดอยู่ตอนนี้
                  </Chip>
                ) : (
                  <Chip variant="neutral" size="sm">
                    ปิดอยู่ตอนนี้
                  </Chip>
                )}
                {shop.services.length > 0 ? (
                  <Chip variant="premium" size="sm">
                    {shop.services.length} บริการ
                  </Chip>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        {/* Description */}
        {shop.description ? (
          <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 md:p-6">
            <h2 className="font-display text-headline-md text-on-surface mb-2">
              เกี่ยวกับร้าน
            </h2>
            <p className="text-body-md text-on-surface-variant whitespace-pre-line">
              {shop.description}
            </p>
          </section>
        ) : null}

        {/* Services catalogue — each service shows its own duration & price */}
        {shop.services.length > 0 ? (
          <section className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
            <header className="px-5 md:px-6 py-4 border-b border-outline-variant/40">
              <h2 className="font-display text-headline-md text-on-surface">
                บริการ
              </h2>
            </header>
            <ul className="divide-y divide-outline-variant/40">
              {shop.services.map((service) => (
                <li
                  key={service.id}
                  className="px-5 md:px-6 py-4 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <p className="text-body-md font-medium text-on-surface">
                      {service.name}
                    </p>
                    <p className="text-label-sm text-on-surface-variant flex items-center gap-1 mt-0.5">
                      <Icon name="schedule" size={14} />
                      {formatDuration(service.durationMinutes)}
                    </p>
                  </div>
                  {service.price != null ? (
                    <span className="text-body-md font-semibold text-primary shrink-0">
                      {formatBaht(service.price)}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* Contact & quick facts */}
        <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 md:p-6 space-y-3">
          <h2 className="font-display text-headline-md text-on-surface">
            ติดต่อ
          </h2>
          {shop.address ? (
            <InfoRow icon="location_on" label="ที่อยู่" value={shop.address} />
          ) : null}
          {shop.contact_phone ? (
            <InfoRow
              icon="phone"
              label="เบอร์โทร"
              value={
                <a
                  href={`tel:${shop.contact_phone}`}
                  className="text-primary hover:underline"
                >
                  {formatPhone(shop.contact_phone)}
                </a>
              }
            />
          ) : null}
        </section>

        {/* Hours */}
        <section className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
          <header className="px-5 md:px-6 py-4 border-b border-outline-variant/40">
            <h2 className="font-display text-headline-md text-on-surface">
              เวลาทำการ
            </h2>
          </header>
          <BusinessHoursDisplay
            hours={shop.hours}
            currentDay={now.dayOfWeek}
          />
        </section>

        {/* CTA — booking flow (only when the shop has bookable services) */}
        <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 md:p-6">
          <div className="flex flex-col gap-2 text-center">
            {shop.services.length > 0 ? (
              <>
                <Link
                  href={`/shops/${shop.id}/book`}
                  className="inline-flex items-center justify-center gap-2 w-full h-14 px-6 rounded-full bg-primary text-on-primary font-bold text-label-lg shadow-tinted hover:opacity-90 transition-opacity"
                >
                  <Icon name="event_available" />
                  จองคิวร้านนี้
                </Link>
                <p className="text-label-sm text-on-surface-variant">
                  จองล่วงหน้าได้ทันที โดยไม่ต้องสมัครสมาชิก
                </p>
              </>
            ) : (
              <>
                <div
                  aria-disabled="true"
                  className="inline-flex items-center justify-center gap-2 w-full h-14 px-6 rounded-full bg-surface-container text-on-surface-variant font-bold text-label-lg cursor-not-allowed select-none"
                >
                  <Icon name="event_busy" />
                  ยังไม่เปิดให้จอง
                </div>
                <p className="text-label-sm text-on-surface-variant">
                  ร้านนี้ยังไม่ได้เพิ่มบริการที่เปิดให้จอง
                </p>
              </>
            )}
          </div>
        </section>
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
        <SiteAuthLink />
      </div>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-outline-variant bg-surface-container-low mt-auto">
      <div className="max-w-[1280px] mx-auto px-4 md:px-12 py-8 text-center md:text-left text-label-sm text-on-surface-variant">
        © {new Date().getFullYear()} LuxeQueue Premium Concierge
      </div>
    </footer>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="w-9 h-9 rounded-full bg-primary-container/15 text-primary flex items-center justify-center shrink-0 mt-0.5">
        <Icon name={icon} size={18} />
      </span>
      <div className="min-w-0">
        <p className="text-label-sm text-on-surface-variant uppercase tracking-widest">
          {label}
        </p>
        <div className="text-body-md text-on-surface break-words">{value}</div>
      </div>
    </div>
  );
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} นาที`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  if (rem === 0) return `${hours} ชั่วโมง`;
  return `${hours} ชม. ${rem} นาที`;
}

function formatBaht(price: number): string {
  return `${price.toLocaleString("th-TH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} บาท`;
}

function formatPhone(raw: string): string {
  if (raw.length === 10 && /^\d+$/u.test(raw)) {
    return `${raw.slice(0, 3)}-${raw.slice(3, 6)}-${raw.slice(6)}`;
  }
  return raw;
}
