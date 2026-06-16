import { notFound, redirect } from "next/navigation";
import { cn } from "@/lib/cn";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { CustomerBottomNav } from "@/components/layout/CustomerBottomNav";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { Icon } from "@/components/ui/Icon";
import {
  getBookingContext,
  getBookingForReschedule,
} from "@/lib/services/bookings";
import { shouldShowCustomerBottomNav } from "@/lib/auth/customer-bottom-nav";
import { RescheduleForm } from "./RescheduleForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "เลื่อนเวลาการจอง · quego",
};

type RouteParams = Promise<{ id: string }>;

export default async function RescheduleBookingPage({
  params,
}: {
  params: RouteParams;
}) {
  const { id } = await params;
  const info = await getBookingForReschedule(id);
  if (!info) notFound();
  // Cancelled / completed / past the cutoff window → bounce to the booking page
  // with a flash explaining why it can't be changed.
  if (!info.changeable) redirect(`/bookings/${id}?notice=reschedule-toolate`);

  // Exclude this booking from the picker's busy intervals so its own slot isn't
  // counted against the move.
  const context = await getBookingContext(info.shopId, undefined, id);
  if (!context) notFound();

  const showCustomerNav = await shouldShowCustomerBottomNav();

  return (
    <main
      className={cn(
        "min-h-screen bg-background flex flex-col",
        showCustomerNav &&
          "pb-[calc(4rem+env(safe-area-inset-bottom))] sm:pb-0",
      )}
    >
      <SiteHeader />

      <div className="max-w-2xl mx-auto w-full px-4 md:px-6 py-6 space-y-stack-md">
        <div>
          <p className="text-label-sm uppercase tracking-widest text-primary/70">
            จัดการคิว
          </p>
          <h1 className="font-display text-headline-lg text-on-surface mt-1">
            เลื่อนเวลาการจอง
          </h1>
          <p className="text-label-md text-on-surface-variant mt-1">
            เลือกวันและเวลาใหม่ — บริการและผู้ให้บริการเดิมจะถูกเก็บไว้
          </p>
        </div>

        <section className="bg-secondary-container/30 border border-secondary/20 text-on-secondary-container rounded-2xl p-4 flex items-start gap-3">
          <Icon name="event" className="text-secondary mt-0.5" />
          <div className="min-w-0">
            <p className="text-label-sm uppercase tracking-widest opacity-80">
              เวลาปัจจุบัน
            </p>
            <p className="text-body-md font-semibold">
              {formatThaiDate(info.bookingDate)} · {info.slotTime} น.
            </p>
            {info.serviceName || info.staffName ? (
              <p className="text-label-md opacity-90 mt-0.5">
                {[info.serviceName, info.staffName].filter(Boolean).join(" · ")}
              </p>
            ) : null}
          </div>
        </section>

        <RescheduleForm
          bookingId={id}
          context={context}
          durationMinutes={info.serviceDurationMinutes}
          staffId={info.staffId}
          serviceName={info.serviceName}
          staffName={info.staffName}
          currentDate={info.bookingDate}
          currentSlot={info.slotTime}
          showCustomerNav={showCustomerNav}
        />
      </div>

      <LandingFooter />

      {showCustomerNav ? <CustomerBottomNav /> : null}
    </main>
  );
}

function formatThaiDate(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const dayLabel = THAI_DAY_LONG[dt.getUTCDay()];
  const monthLabel = THAI_MONTH_LONG[m - 1];
  return `วัน${dayLabel}ที่ ${d} ${monthLabel} ${y + 543}`;
}

const THAI_DAY_LONG = [
  "อาทิตย์",
  "จันทร์",
  "อังคาร",
  "พุธ",
  "พฤหัสบดี",
  "ศุกร์",
  "เสาร์",
];

const THAI_MONTH_LONG = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];
