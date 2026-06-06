import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { SiteAuthLink } from "@/components/layout/SiteAuthLink";
import { getBookingContext } from "@/lib/services/bookings";
import { getCustomerSession } from "@/lib/auth/customer-session-server";
import { getCustomerProfile } from "@/lib/services/customers";
import { BookingForm } from "./BookingForm";

export const dynamic = "force-dynamic";

type RouteParams = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: RouteParams }) {
  const { id } = await params;
  const ctx = await getBookingContext(id);
  if (!ctx) return { title: "จองคิว · queva" };
  return {
    title: `จองคิวร้าน ${ctx.shop.name} · queva`,
  };
}

export default async function BookShopPage({
  params,
}: {
  params: RouteParams;
}) {
  const { id } = await params;
  const context = await getBookingContext(id);
  if (!context) notFound();

  // Pre-fill the booker fields when a customer is signed in. Public page, so
  // this is best-effort: no session simply means an empty form.
  const session = await getCustomerSession();
  const profile = session ? await getCustomerProfile(session.customerId) : null;

  // A shop is bookable only once it has at least one active service.
  const hasServices = context.services.length > 0;
  const serviceLabel =
    context.services.length > 1
      ? `${context.services.length} บริการให้เลือก`
      : context.services.length === 1
        ? `บริการครั้งละ ${context.services[0].durationMinutes} นาที`
        : "";

  return (
    <main className="min-h-screen bg-background flex flex-col">
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
            {hasServices
              ? `${serviceLabel} · จองล่วงหน้าได้ ${countDays(context.windowStart, context.windowEnd)} วัน`
              : "ร้านนี้ยังไม่เปิดให้จอง"}
          </p>
        </section>

        {hasServices ? (
          <BookingForm
            context={context}
            defaultName={profile?.name ?? ""}
            defaultPhone={profile?.phone ?? session?.phone ?? ""}
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

      <SiteFooter />
    </main>
  );
}

function countDays(start: string, end: string): number {
  const [y1, m1, d1] = start.split("-").map(Number);
  const [y2, m2, d2] = end.split("-").map(Number);
  const a = Date.UTC(y1, m1 - 1, d1);
  const b = Date.UTC(y2, m2 - 1, d2);
  return Math.round((b - a) / (24 * 60 * 60 * 1000)) + 1;
}

function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 bg-surface/95 backdrop-blur border-b border-outline-variant">
      <div className="max-w-[1280px] mx-auto px-4 md:px-12 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="font-display font-bold text-headline-md text-primary tracking-tight">
            queva
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
        © {new Date().getFullYear()} queva · ไม่ต้องรอเก้อ แค่กดจอง
      </div>
    </footer>
  );
}
