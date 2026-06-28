import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/Icon";
import { Button, buttonClassName } from "@/components/ui/Button";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { CustomerBottomNav } from "@/components/layout/CustomerBottomNav";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { Chip } from "@/components/ui/Chip";
import { BusinessHoursPanel } from "@/components/booking/BusinessHoursPanel";
import { LiveQueueStatus } from "@/components/booking/LiveQueueStatus";
import { ServiceList } from "@/components/booking/ServiceList";
import { ShopReviewsSection } from "@/components/reviews/ShopReviewsSection";
import { getPublicShopByHandleOrId } from "@/lib/services/shops";
import { shopImageUrl } from "@/lib/r2/url";
import { isUuid } from "@/lib/validation/uuid";
import {
  getShopPublicQueueStatus,
  type ShopQueueStatus,
} from "@/lib/services/bookings";
import { listShopReviews } from "@/lib/services/reviews";
import { getBangkokNow } from "@/lib/time/bangkok";
import { shouldShowCustomerBottomNav } from "@/lib/auth/customer-bottom-nav";

export const dynamic = "force-dynamic";

type RouteParams = Promise<{ id: string }>;

const DAY_LABELS = [
  "อาทิตย์",
  "จันทร์",
  "อังคาร",
  "พุธ",
  "พฤหัสบดี",
  "ศุกร์",
  "เสาร์",
] as const;

/**
 * Hero fallback when the shop is closed for the rest of today: find the next
 * day (within a week) the shop opens and phrase it as "เปิดพรุ่งนี้/เปิดวัน… HH:MM น.".
 * Returns null only if no open day is configured at all.
 */
function nextOpeningNote(
  hours: {
    dayOfWeek: number;
    isOpen: boolean;
    openTime: string | null;
    closeTime: string | null;
  }[],
  currentDay: number,
): string | null {
  for (let offset = 1; offset <= 7; offset += 1) {
    const dow = (currentDay + offset) % 7;
    const h = hours.find((x) => x.dayOfWeek === dow);
    if (h?.isOpen && h.openTime && h.closeTime) {
      const when = offset === 1 ? "พรุ่งนี้" : `วัน${DAY_LABELS[dow]}`;
      return `เปิด${when} ${h.openTime} น.`;
    }
  }
  return null;
}

export async function generateMetadata({ params }: { params: RouteParams }) {
  const { id: param } = await params;
  const shop = await getPublicShopByHandleOrId(param);
  if (!shop) {
    return { title: "ไม่พบร้านที่ต้องการ · Quego" };
  }
  return {
    title: `${shop.name} · Quego`,
    description:
      shop.description ?? `จองคิวร้าน ${shop.name} ผ่าน Quego ได้ทันที`,
  };
}

export default async function ShopDetailPage({
  params,
}: {
  params: RouteParams;
}) {
  const { id: param } = await params;
  const shop = await getPublicShopByHandleOrId(param);
  if (!shop) notFound();

  // Canonicalise the URL: a visitor who arrived via a legacy UUID link or QR is
  // redirected (once) to the shop's pretty handle, so the address bar, shares,
  // and SEO all settle on /shops/{handle}.
  if (isUuid(param) && shop.handle && shop.handle !== param) {
    redirect(`/shops/${shop.handle}`);
  }

  const [queueStatus, reviewData, showCustomerNav] = await Promise.all([
    getShopPublicQueueStatus(shop.id),
    listShopReviews(shop.id),
    shouldShowCustomerBottomNav(),
  ]);

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
  // opening time while still before opening, and — once closed for the day or
  // on a day the shop doesn't open — the NEXT opening ("เปิดพรุ่งนี้ HH:MM น.")
  // so a visitor never has to scroll to the hours table to learn when to return.
  // "เปิดถึง" reads unambiguously vs. "ปิด HH:MM" which can scan as "closed".
  const todayTimeNote =
    todayHours?.isOpen && todayHours.openTime && todayHours.closeTime
      ? isOpenNow
        ? `เปิดถึง ${todayHours.closeTime} น.`
        : now.timeHHMM < todayHours.openTime
          ? `เปิด ${todayHours.openTime} น.`
          : nextOpeningNote(shop.hours, now.dayOfWeek)
      : nextOpeningNote(shop.hours, now.dayOfWeek);

  // Short area line for the hero (เขต, จังหวัด) — location is a primary
  // booking-decision input, so surface it up top instead of only at page end.
  const heroArea = [shop.district, shop.province].filter(Boolean).join(", ");

  // Facebook-style hero imagery. Both null today for every shop, so the hero
  // gracefully falls back to the brand gradient cover + category-icon logo with
  // ZERO visual change until a shop actually uploads images.
  const coverUrl = shopImageUrl(shop.cover_key);
  const logoUrl = shopImageUrl(shop.logo_key);

  const hasContact = Boolean(
    shop.address || shop.province || shop.contact_phone,
  );

  // A shop is bookable only once it has at least one active service. When it is,
  // the page gets a single floating booking bar (below) — pad the page so the
  // last content and footer clear the fixed bar instead of hiding behind it.
  const isBookable = shop.services.length > 0;

  // Single source of truth for the booking link — shared by the floating bar
  // (mobile/tablet) and the inline CTA inside the decision card (desktop), so the
  // two booking entry points can never drift apart.
  const bookHref = `/shops/${shop.handle ?? shop.id}/book`;

  // Bottom inset reserved for whatever floats over the page bottom: the booking
  // bar (~5rem) and/or the customer tab bar (~4rem). The tab bar is `lg:hidden`,
  // so for a signed-in customer it stays visible through the whole tablet range
  // and the bar stacks above it — reserve bar+nav (9rem) until lg. At lg:+ both
  // the bar and the tab bar are gone (the CTA moves in-card), so no inset.
  const mainBottomInset = isBookable
    ? showCustomerNav
      ? "pb-[calc(env(safe-area-inset-bottom)+9rem)] lg:pb-0"
      : "pb-[calc(env(safe-area-inset-bottom)+5rem)] lg:pb-0"
    : showCustomerNav
      ? "pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0"
      : undefined;

  return (
    <main
      className={cn(
        "min-h-screen bg-background flex flex-col",
        mainBottomInset,
      )}
    >
      <SiteHeader />

      <div className="max-w-3xl mx-auto w-full px-4 md:px-6 py-6 space-y-stack-md">
        <Link
          href="/"
          className="inline-flex min-h-11 -my-2 items-center gap-1 text-label-md text-on-surface-variant hover:text-primary transition-colors"
        >
          <Icon name="arrow_back" size={18} />
          กลับหน้าค้นหา
        </Link>

        {/* Hero — Facebook-style cover band + overlapping logo. The cover is a
            photo when uploaded, else the brand gradient; the logo is a circular
            avatar when uploaded, else the category icon. Metadata reflows below
            the logo so it reads cleanly on a white card regardless of cover. */}
        <section className="overflow-hidden rounded-xl border border-outline-variant/40 bg-surface-container-lowest shadow-luxury">
          {/* Cover band */}
          <div
            className={cn(
              "relative h-40 md:h-56",
              coverUrl ? "bg-surface-container-high" : "bg-luxury-gradient",
            )}
          >
            {coverUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={coverUrl}
                  alt={`ภาพหน้าปกร้าน ${shop.name}`}
                  className="absolute inset-0 h-full w-full object-cover"
                />
                {/* Scrim — keeps the overlapping logo's ring and any future
                    over-cover text legible against a bright photo. */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
              </>
            ) : null}

            {/* Logo, overlapping the cover's bottom-left. */}
            <div className="absolute -bottom-10 md:-bottom-12 left-5 md:left-8">
              <span
                className={cn(
                  "flex items-center justify-center overflow-hidden rounded-full ring-4 ring-surface-container-lowest shadow-tinted",
                  "w-20 h-20 md:w-24 md:h-24",
                  logoUrl ? "bg-surface-container-high" : "bg-luxury-gradient",
                )}
              >
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoUrl}
                    alt={`โลโก้ร้าน ${shop.name}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Icon
                    name={shop.category.icon ?? "storefront"}
                    className="text-on-primary"
                    size={40}
                  />
                )}
              </span>
            </div>
          </div>

          {/* Metadata — sits below the logo, on the white card surface. */}
          <div className="px-5 md:px-8 pt-12 md:pt-14 pb-6 space-y-2">
            <p className="text-label-sm uppercase tracking-widest text-on-surface-variant">
              {shop.category.name}
            </p>
            <h1 className="font-display text-headline-lg leading-tight text-on-surface">
              {shop.name}
            </h1>
            {heroArea ? (
              <p className="flex items-center gap-1.5 text-label-md text-on-surface-variant">
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
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-label-sm font-semibold uppercase tracking-wider text-primary">
                  {shop.services.length} บริการ
                </span>
              ) : null}
              {reviewData.summary.count > 0 ? (
                <span
                  role="img"
                  aria-label={`คะแนนเฉลี่ย ${reviewData.summary.average.toFixed(1)} จาก 5 ดาว จาก ${reviewData.summary.count} รีวิว`}
                  className="inline-flex items-center gap-1 rounded-full bg-tertiary/10 px-2.5 py-0.5 text-label-sm font-semibold text-tertiary"
                >
                  <Icon name="star" filled size={14} className="text-tertiary" />
                  <span className="tabular-nums">
                    {reviewData.summary.average.toFixed(1)}
                  </span>
                  <span className="font-normal text-on-surface-variant tabular-nums">
                    ({reviewData.summary.count})
                  </span>
                </span>
              ) : null}
            </div>
            {todayTimeNote ? (
              <p className="flex items-center gap-1.5 text-label-md text-on-surface-variant pt-1">
                <Icon name="schedule" size={15} />
                {todayTimeNote}
              </p>
            ) : null}
          </div>
        </section>

        {/* Decision zone — live queue status + the primary "จองคิวร้านนี้" CTA.
            On mobile/tablet the CTA lives in the floating bar (below); on desktop
            (lg:+) it surfaces inline in this card — above the fold, in the same
            glance as the queue status — and the floating bar is hidden. Either
            way there is exactly one booking entry point per viewport. This card
            also carries the not-yet-bookable notice when applicable. */}
        <QueueStatusPanel
          status={queueStatus}
          shopId={shop.id}
          isOpen={isOpenNow}
          bookHref={isBookable ? bookHref : undefined}
        >
          {!isBookable ? (
            <>
              <Button
                type="button"
                disabled
                size="xl"
                fullWidth
                iconLeft={<Icon name="event_busy" />}
                className="bg-surface-container text-on-surface-variant hover:bg-surface-container shadow-none"
              >
                ยังไม่เปิดให้จอง
              </Button>
              <p className="text-label-sm text-on-surface-variant text-center">
                ร้านนี้ยังไม่ได้เพิ่มบริการที่เปิดให้จอง
              </p>
            </>
          ) : null}
        </QueueStatusPanel>

        {/* Services catalogue — the customer's main decision input, so it sits
            right under the CTA. Each service shows its own duration & price. */}
        {shop.services.length > 0 ? (
          <section className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
            <header className="px-5 md:px-6 py-4 border-b border-outline-variant/40">
              <h2 className="font-display text-headline-md text-on-surface flex items-center gap-2">
                บริการ
                <span className="text-label-md font-semibold text-on-surface-variant tabular-nums">
                  ({shop.services.length})
                </span>
              </h2>
            </header>
            <ServiceList services={shop.services} initialCount={5} />
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

      {/* Floating booking bar — the always-reachable booking CTA on mobile and
          tablet. Coral (brand accent CTA) so it stands out against the teal
          hero/surface. Hidden when not bookable, and replaced on lg:+ by the
          in-card CTA so desktop isn't left with a mobile-style bottom bar
          floating over the footer. The pill spans the full content container
          width (max-w-3xl) at every visible width. */}
      {isBookable ? (
        <div
          className={cn(
            "fixed inset-x-0 z-40 lg:hidden border-t border-outline-variant bg-surface/95 backdrop-blur",
            // The customer tab bar is `lg:hidden`, so it's present across mobile
            // AND tablet — sit the bar above it whenever it's shown. At lg:+ this
            // bar is hidden anyway (the CTA moves in-card).
            showCustomerNav
              ? "bottom-[calc(4rem+env(safe-area-inset-bottom))]"
              : "bottom-0",
          )}
        >
          <div className="mx-auto w-full max-w-3xl px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <Link
              href={bookHref}
              className={buttonClassName({
                size: "xl",
                fullWidth: true,
                className:
                  "bg-secondary text-on-secondary hover:bg-secondary/90 shadow-coral-glow hover:shadow-coral-glow",
              })}
            >
              <Icon name="event_available" />
              จองคิวร้านนี้
            </Link>
          </div>
        </div>
      ) : null}

      <LandingFooter />

      {showCustomerNav ? <CustomerBottomNav /> : null}
    </main>
  );
}

function QueueStatusPanel({
  status,
  shopId,
  isOpen,
  bookHref,
  children,
}: {
  status: ShopQueueStatus;
  shopId: string;
  isOpen: boolean;
  bookHref?: string;
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
      {/* Desktop (lg:+) booking CTA — surfaces inline here, in the same glance as
          the queue status, while the floating bar is hidden at this width. */}
      {bookHref ? (
        <div className="hidden lg:flex flex-col gap-2 px-5 md:px-6 pb-5 md:pb-6 pt-1">
          <Link
            href={bookHref}
            className={buttonClassName({
              size: "xl",
              fullWidth: true,
              className:
                "bg-secondary text-on-secondary hover:bg-secondary/90 shadow-coral-glow hover:shadow-coral-glow",
            })}
          >
            <Icon name="event_available" />
            จองคิวร้านนี้
          </Link>
        </div>
      ) : null}
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
      <span className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
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

function formatPhone(raw: string): string {
  if (raw.length === 10 && /^\d+$/u.test(raw)) {
    return `${raw.slice(0, 3)}-${raw.slice(3, 6)}-${raw.slice(6)}`;
  }
  return raw;
}
