import Link from "next/link";
import { notFound } from "next/navigation";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/Icon";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { CustomerBottomNav } from "@/components/layout/CustomerBottomNav";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { getBookingContext } from "@/lib/services/bookings";
import { getCustomerSession } from "@/lib/auth/customer-session-server";
import { shouldShowCustomerBottomNav } from "@/lib/auth/customer-bottom-nav";
import { getCustomerProfile } from "@/lib/services/customers";
import { getLineLinkStatus } from "@/lib/services/line-linking";
import { BookingForm } from "./BookingForm";

export const dynamic = "force-dynamic";

type RouteParams = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: RouteParams }) {
  const { id } = await params;
  const ctx = await getBookingContext(id);
  if (!ctx) return { title: "จองคิว · quego" };
  return {
    title: `จองคิวร้าน ${ctx.shop.name} · quego`,
  };
}

export default async function BookShopPage({
  params,
  searchParams,
}: {
  params: RouteParams;
  // OPP-05: a waitlist "จองเลย" deep link carries serviceId/staffId/date so the
  // booking form lands prefilled, ready to pick a freshly-freed time.
  searchParams: Promise<{ serviceId?: string; staffId?: string; date?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const context = await getBookingContext(id);
  if (!context) notFound();

  // Pre-fill the booker fields when a customer is signed in. Public page, so
  // this is best-effort: no session simply means an empty form. We also surface
  // whether their LINE is connected, so the waitlist panel can nudge them to
  // connect it (the channel the "slot opened" alert rides on).
  const session = await getCustomerSession();
  const [profile, lineStatus] = session
    ? await Promise.all([
        getCustomerProfile(session.customerId),
        getLineLinkStatus(session.customerId),
      ])
    : [null, null];

  const showCustomerNav = await shouldShowCustomerBottomNav();

  // A shop is bookable only once it has at least one active service.
  const hasServices = context.services.length > 0;
  const serviceLabel =
    context.services.length > 1
      ? `${context.services.length} บริการให้เลือก`
      : context.services.length === 1
        ? `บริการครั้งละ ${context.services[0].durationMinutes} นาที`
        : "";

  return (
    <main
      className={cn(
        "min-h-screen bg-background flex flex-col",
        showCustomerNav &&
          "pb-[calc(4rem+env(safe-area-inset-bottom))] sm:pb-0",
      )}
    >
      <SiteHeader />

      <div className="max-w-3xl mx-auto w-full px-4 md:px-6 py-6 space-y-stack-md">
        <Link
          href={`/shops/${id}`}
          className="inline-flex items-center gap-1 text-label-md text-on-surface-variant hover:text-primary transition-colors"
        >
          <Icon name="arrow_back" size={18} />
          กลับหน้าร้าน
        </Link>

        <section className="bg-luxury-gradient text-on-primary rounded-2xl p-6 md:p-8 shadow-luxury">
          <p className="text-label-sm uppercase tracking-widest opacity-80">
            จองคิว
          </p>
          <h1 className="font-display text-headline-lg leading-tight mt-1">
            {context.shop.name}
          </h1>
          <p className="text-body-md opacity-90 mt-2">
            {hasServices ? serviceLabel : "ร้านนี้ยังไม่เปิดให้จอง"}
          </p>
        </section>

        {hasServices ? (
          <BookingForm
            context={context}
            defaultName={profile?.name ?? ""}
            defaultPhone={profile?.phone ?? session?.phone ?? ""}
            prefill={{ serviceId: sp.serviceId, staffId: sp.staffId, date: sp.date }}
            lineConnected={lineStatus?.linked}
            showCustomerNav={showCustomerNav}
          />
        ) : (
          <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 text-center space-y-3">
            <span className="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center mx-auto">
              <Icon
                name="event_busy"
                size={28}
                className="text-on-surface-variant"
              />
            </span>
            <h2 className="font-display text-headline-md text-on-surface">
              ยังไม่เปิดให้จอง
            </h2>
            <p className="text-body-md text-on-surface-variant">
              ร้านนี้ยังไม่ได้เพิ่มบริการที่เปิดให้จอง ลองติดต่อร้านโดยตรง
              หรือเลือกร้านอื่น
            </p>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-full bg-primary text-on-primary font-bold text-label-md hover:opacity-90 transition-opacity"
            >
              <Icon name="search" size={18} />
              เลือกร้านอื่น
            </Link>
          </section>
        )}
      </div>

      <LandingFooter />

      {showCustomerNav ? <CustomerBottomNav /> : null}
    </main>
  );
}

