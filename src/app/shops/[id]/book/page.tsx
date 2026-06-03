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
  if (!ctx) return { title: "จองคิว · LuxeQueue" };
  return {
    title: `จองคิวร้าน ${ctx.shop.name} · LuxeQueue`,
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
            บริการครั้งละ {context.shop.serviceDurationMinutes} นาที ·
            จองล่วงหน้าได้ {countDays(context.windowStart, context.windowEnd)} วัน
          </p>
        </section>

        <BookingForm
          context={context}
          defaultName={profile?.name ?? ""}
          defaultPhone={profile?.phone ?? session?.phone ?? ""}
        />
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
