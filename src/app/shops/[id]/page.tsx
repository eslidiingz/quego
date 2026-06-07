import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { Chip } from "@/components/ui/Chip";
import { BusinessHoursPanel } from "@/components/booking/BusinessHoursPanel";
import { LiveQueueStatus } from "@/components/booking/LiveQueueStatus";
import { ShopReviewsSection } from "@/components/reviews/ShopReviewsSection";
import { getPublicShopById } from "@/lib/services/shops";
import {
  getShopPublicQueueStatus,
  type ShopQueueStatus,
} from "@/lib/services/bookings";
import { listShopReviews } from "@/lib/services/reviews";
import { getBangkokNow } from "@/lib/time/bangkok";
import { formatBaht } from "@/lib/baht";

export const dynamic = "force-dynamic";

type RouteParams = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: RouteParams }) {
  const { id } = await params;
  const shop = await getPublicShopById(id);
  if (!shop) {
    return { title: "ไม่พบร้านที่ต้องการ · queva" };
  }
  return {
    title: `${shop.name} · queva`,
    description:
      shop.description ?? `จองคิวร้าน ${shop.name} ผ่าน queva ได้ทันที`,
  };
}

export default async function ShopDetailPage({
  params,
}: {
  params: RouteParams;
}) {
  const { id } = await params;
  const [shop, queueStatus, reviewData] = await Promise.all([
    getPublicShopById(id),
    getShopPublicQueueStatus(id),
    listShopReviews(id),
  ]);
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

  // Today's at-a-glance time note for the hero: "open until X" while open,
  // opening time while still before opening, nothing once closed for the day.
  // "เปิดถึง" reads unambiguously vs. "ปิด HH:MM" which can scan as "closed".
  const todayTimeNote =
    todayHours?.isOpen && todayHours.openTime && todayHours.closeTime
      ? isOpenNow
        ? `เปิดถึง ${todayHours.closeTime} น.`
        : now.timeHHMM < todayHours.openTime
          ? `เปิด ${todayHours.openTime} น.`
          : null
      : null;

  // Short area line for the hero (เขต, จังหวัด) — location is a primary
  // booking-decision input, so surface it up top instead of only at page end.
  const heroArea = [shop.district, shop.province].filter(Boolean).join(", ");

  const hasContact = Boolean(
    shop.address || shop.province || shop.contact_phone,
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
            <span className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-on-primary/15 backdrop-blur-sm flex items-center justify-center shrink-0">
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
              {heroArea ? (
                <p className="flex items-center gap-1.5 text-label-md text-on-primary/85">
                  <Icon name="location_on" size={15} />
                  {heroArea}
                </p>
              ) : null}
              <div className="flex items-center gap-2 flex-wrap pt-1">
                {isOpenNow ? (
                  <Chip variant="success" size="sm" pulse>
                    เปิดอยู่ตอนนี้
                  </Chip>
                ) : (
                  <Chip variant="neutral" size="sm">
                    ปิดแล้ว
                  </Chip>
                )}
                {shop.services.length > 0 ? (
                  // Glass pill (not a Chip) — a primary-tinted chip would vanish
                  // against the teal hero gradient (same color). Matches the
                  // icon container's bg-on-primary/15 frosted treatment.
                  <span className="inline-flex items-center gap-1 rounded-full bg-on-primary/15 backdrop-blur-sm px-2.5 py-0.5 text-label-sm font-semibold uppercase tracking-wider text-on-primary">
                    {shop.services.length} บริการ
                  </span>
                ) : null}
                {reviewData.summary.count > 0 ? (
                  // Same glass treatment; gold star reads clearly on the teal hero.
                  <span className="inline-flex items-center gap-1 rounded-full bg-on-primary/15 backdrop-blur-sm px-2.5 py-0.5 text-label-sm font-semibold text-on-primary">
                    <Icon name="star" filled size={14} className="text-tertiary-fixed-dim" />
                    <span className="tabular-nums">
                      {reviewData.summary.average.toFixed(1)}
                    </span>
                    <span className="font-normal opacity-80 tabular-nums">
                      ({reviewData.summary.count})
                    </span>
                  </span>
                ) : null}
              </div>
              {todayTimeNote ? (
                <p className="flex items-center gap-1.5 text-label-md text-on-primary/85 pt-1">
                  <Icon name="schedule" size={15} />
                  {todayTimeNote}
                </p>
              ) : null}
            </div>
          </div>
        </section>

        {/* Decision zone — live queue status and the primary CTA share one card
            so the status reads as direct support for the "book now" action. */}
        <QueueStatusPanel status={queueStatus} shopId={shop.id} isOpen={isOpenNow}>
          {shop.services.length > 0 ? (
            <>
              <Link
                href={`/shops/${shop.id}/book`}
                className="inline-flex items-center justify-center gap-2 w-full h-14 px-6 rounded-full bg-primary text-on-primary font-bold text-label-lg shadow-tinted hover:opacity-90 transition-opacity"
              >
                <Icon name="event_available" />
                จองคิวร้านนี้
              </Link>
              <p className="text-label-sm text-on-surface-variant text-center">
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
              <p className="text-label-sm text-on-surface-variant text-center">
                ร้านนี้ยังไม่ได้เพิ่มบริการที่เปิดให้จอง
              </p>
            </>
          )}
        </QueueStatusPanel>

        {/* Services catalogue — the customer's main decision input, so it sits
            right under the CTA. Each service shows its own duration & price. */}
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

        {/* Customer reviews — social proof, sits between the catalogue and the
            free-text "about" blurb. */}
        <ShopReviewsSection
          summary={reviewData.summary}
          reviews={reviewData.reviews}
        />

        {/* About the shop — secondary context, after the services. */}
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

        {/* Practical info — hours (collapsed to today by default) + contact,
            grouped into one card so they don't pad out the scroll. */}
        <section className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
          <header className="px-5 md:px-6 py-4 border-b border-outline-variant/40">
            <h2 className="font-display text-headline-md text-on-surface">
              ข้อมูลร้าน
            </h2>
          </header>

          <BusinessHoursPanel hours={shop.hours} currentDay={now.dayOfWeek} />

          {hasContact ? (
            <div className="px-5 md:px-6 py-5 space-y-3 border-t border-outline-variant/40">
              {shop.address ? (
                <InfoRow icon="location_on" label="ที่อยู่" value={shop.address} />
              ) : null}
              {shop.province ? (
                <InfoRow
                  icon="map"
                  label="พื้นที่"
                  value={[shop.subdistrict, shop.district, shop.province]
                    .filter(Boolean)
                    .join(", ")}
                />
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
            </div>
          ) : null}
        </section>
      </div>

      <LandingFooter />
    </main>
  );
}

function QueueStatusPanel({
  status,
  shopId,
  isOpen,
  children,
}: {
  status: ShopQueueStatus;
  shopId: string;
  isOpen: boolean;
  children?: React.ReactNode;
}) {
  return (
    <section className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 md:px-6 py-4 border-b border-outline-variant/40">
        <h2 className="font-display text-headline-md text-on-surface">
          สถานะคิววันนี้
        </h2>
        {isOpen ? (
          <span className="inline-flex items-center gap-1.5 text-label-sm font-medium text-secondary">
            <span className="size-2 rounded-full bg-secondary animate-queue-pulse" />
            กำลังเปิด
          </span>
        ) : (
          <span className="text-label-sm text-on-surface-variant">ปิดอยู่</span>
        )}
      </div>
      <LiveQueueStatus shopId={shopId} initial={status} />
      {children ? (
        <div className="flex flex-col gap-2 px-5 md:px-6 pb-5 md:pb-6 pt-1">
          {children}
        </div>
      ) : null}
    </section>
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

function formatPhone(raw: string): string {
  if (raw.length === 10 && /^\d+$/u.test(raw)) {
    return `${raw.slice(0, 3)}-${raw.slice(3, 6)}-${raw.slice(6)}`;
  }
  return raw;
}
