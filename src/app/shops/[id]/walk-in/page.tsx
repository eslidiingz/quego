import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { buttonClassName } from "@/components/ui/Button";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { getBookingContext } from "@/lib/services/bookings";
import { resolveApprovedShopId } from "@/lib/services/shops";
import { WalkInForm } from "./WalkInForm";
import { joinWalkInAction } from "./actions";

export const dynamic = "force-dynamic";

type RouteParams = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: RouteParams }) {
  const { id: param } = await params;
  const shopId = await resolveApprovedShopId(param);
  const ctx = shopId ? await getBookingContext(shopId) : null;
  if (!ctx) return { title: "เช็คอินหน้าร้าน · Quego" };
  return {
    title: `เช็คอินหน้าร้าน ${ctx.shop.name} · Quego`,
  };
}

/**
 * Public, no-login walk-in self-join page (OPP-08). The shop prints a QR that
 * deep-links here; a customer scans it, picks a service + enters phone, and
 * `WalkInForm` books them into the soonest opening today.
 *
 * Deliberately NO customer-session prefill: a kiosk QR is scanned on a shared
 * device (or the customer's own phone with no session), so we never leak a
 * previous walk-in's name/phone. Lives under the unguarded `/shops/*` namespace
 * alongside `/book`, so it needs no proxy change.
 */
export default async function WalkInPage({
  params,
  searchParams,
}: {
  params: RouteParams;
  // A per-service QR can pre-select via `?serviceId=`; validated in the form.
  searchParams: Promise<{ serviceId?: string }>;
}) {
  const { id: param } = await params;
  const sp = await searchParams;
  const shopId = await resolveApprovedShopId(param);
  const context = shopId ? await getBookingContext(shopId) : null;
  if (!context) notFound();

  // A shop is bookable only once it has at least one active service.
  const hasServices = context.services.length > 0;

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <SiteHeader />

      <div className="max-w-3xl mx-auto w-full px-4 md:px-6 py-6 space-y-stack-md">
        <Link
          href={`/shops/${param}`}
          className="inline-flex items-center gap-1 text-label-md text-on-surface-variant hover:text-primary transition-colors"
        >
          <Icon name="arrow_back" size={18} />
          กลับหน้าร้าน
        </Link>

        <section className="bg-luxury-gradient text-on-primary rounded-2xl p-6 md:p-8 shadow-luxury">
          <p className="text-label-sm uppercase tracking-widest opacity-80">
            เช็คอินหน้าร้าน
          </p>
          <h1 className="font-display text-headline-lg leading-tight mt-1">
            {context.shop.name}
          </h1>
          <p className="text-body-md opacity-90 mt-2">
            {hasServices
              ? "เข้าคิวทันที — รับคิวว่างที่เร็วที่สุดของวันนี้"
              : "ร้านนี้ยังไม่เปิดให้จอง"}
          </p>
        </section>

        {hasServices ? (
          <WalkInForm
            shopId={context.shop.id}
            // Bind the trusted shop id server-side so it can't be forged in the
            // form to evade the rate-limit bucket or retarget the booking.
            action={joinWalkInAction.bind(null, context.shop.id)}
            services={context.services}
            defaultServiceId={sp.serviceId}
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
            <Link href="/" className={buttonClassName({ size: "md" })}>
              <Icon name="search" size={18} />
              เลือกร้านอื่น
            </Link>
          </section>
        )}
      </div>

      <LandingFooter />
    </main>
  );
}
