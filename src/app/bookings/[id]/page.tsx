import Link from "next/link";
import { notFound } from "next/navigation";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/Icon";
import { Chip } from "@/components/ui/Chip";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { CustomerBottomNav } from "@/components/layout/CustomerBottomNav";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { shouldShowCustomerBottomNav } from "@/lib/auth/customer-bottom-nav";
import {
  getBookingById,
  getBookingQueueStatus,
  getBookingChangeEligibility,
} from "@/lib/services/bookings";
import { LiveBookingQueue } from "@/components/booking/LiveBookingQueue";
import { ManageBookingActions } from "./ManageBookingActions";
import { FlashToast } from "@/components/ui/FlashToast";

export const dynamic = "force-dynamic";

type RouteParams = Promise<{ id: string }>;

export const metadata = {
  title: "ยืนยันการจอง · queva",
};

const STATUS_LABEL: Record<
  string,
  { label: string; variant: "confirmed" | "success" | "danger" }
> = {
  confirmed: { label: "รอรับบริการ", variant: "confirmed" },
  completed: { label: "เสร็จสิ้น", variant: "success" },
  cancelled: { label: "ยกเลิก", variant: "danger" },
};

export default async function BookingDetailPage({
  params,
  searchParams,
}: {
  params: RouteParams;
  searchParams: Promise<{ notice?: string }>;
}) {
  const { id } = await params;
  const { notice } = await searchParams;
  const [booking, queue, showCustomerNav] = await Promise.all([
    getBookingById(id),
    getBookingQueueStatus(id),
    shouldShowCustomerBottomNav(),
  ]);
  if (!booking) notFound();

  const status = STATUS_LABEL[booking.status] ?? STATUS_LABEL.confirmed;
  // OPP-04: only confirmed bookings can be self-service changed; the shop's
  // cutoff window decides whether the actions are still offered.
  const eligibility =
    booking.status === "confirmed"
      ? await getBookingChangeEligibility(id)
      : null;

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
        <FlashToast notice={notice} />
        <section className="relative overflow-hidden rounded-2xl bg-luxury-gradient text-on-primary p-6 md:p-10 shadow-luxury">
          <div className="flex flex-col items-center text-center gap-3">
            <span className="w-16 h-16 rounded-full bg-on-primary/15 backdrop-blur-sm flex items-center justify-center">
              <Icon name="check_circle" size={40} />
            </span>
            <div>
              <p className="text-label-sm uppercase tracking-widest opacity-80">
                จองคิวสำเร็จ
              </p>
              <h1 className="font-display text-headline-lg leading-tight mt-1">
                {booking.shopName}
              </h1>
            </div>
            <Chip variant={status.variant} size="sm" pulse={booking.status === "confirmed"}>
              {status.label}
            </Chip>
          </div>
        </section>

        {queue.active ? (
          <LiveBookingQueue bookingId={id} initial={queue} />
        ) : null}

        <section className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 md:p-6 space-y-4">
          <h2 className="font-display text-headline-md text-on-surface">
            รายละเอียดการจอง
          </h2>
          <InfoRow
            icon="event"
            label="วันที่นัด"
            value={formatThaiDate(booking.bookingDate)}
          />
          <InfoRow
            icon="schedule"
            label="เวลานัด"
            value={`${booking.slotTime} น.`}
          />
          {booking.serviceName ? (
            <InfoRow
              icon="design_services"
              label="บริการ"
              value={booking.serviceName}
            />
          ) : null}
          {booking.staffName ? (
            <InfoRow
              icon="person"
              label="ผู้ให้บริการ"
              value={booking.staffName}
            />
          ) : null}
          <InfoRow icon="badge" label="ชื่อผู้จอง" value={booking.customerName} />
          {booking.customerPhone ? (
            <InfoRow
              icon="phone"
              label="เบอร์ติดต่อ"
              value={
                <span className="font-mono tracking-wider">
                  {maskPhone(booking.customerPhone)}
                </span>
              }
            />
          ) : null}
          <InfoRow
            icon="confirmation_number"
            label="รหัสการจอง"
            value={
              <span className="font-mono text-label-md">
                {booking.id.slice(0, 8).toUpperCase()}
              </span>
            }
          />
        </section>

        {booking.status === "confirmed" ? (
          <section className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 md:p-6 space-y-4">
            <h2 className="font-display text-headline-md text-on-surface">
              จัดการคิว
            </h2>
            {eligibility?.changeable ? (
              <>
                <p className="text-label-md text-on-surface-variant">
                  ต้องการเปลี่ยนแปลงใช่ไหม? เลื่อนเวลาไปรอบอื่น
                  หรือยกเลิกคิวนี้ได้เลย
                </p>
                <ManageBookingActions bookingId={id} />
              </>
            ) : (
              <div className="flex items-start gap-3">
                <Icon
                  name="lock_clock"
                  className="text-on-surface-variant mt-0.5"
                />
                <p className="text-label-md text-on-surface-variant">
                  เลยกำหนดเวลาที่เลื่อน/ยกเลิกด้วยตนเองแล้ว
                  {eligibility && eligibility.cutoffHours > 0
                    ? ` (ต้องทำก่อนถึงคิวอย่างน้อย ${eligibility.cutoffHours} ชั่วโมง)`
                    : ""}{" "}
                  หากต้องการเปลี่ยนแปลง กรุณาติดต่อร้านโดยตรง
                </p>
              </div>
            )}
          </section>
        ) : null}

        {booking.shopAddress || booking.shopContactPhone ? (
          <section className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 md:p-6 space-y-3">
            <h2 className="font-display text-headline-md text-on-surface">
              ติดต่อร้าน
            </h2>
            {booking.shopAddress ? (
              <InfoRow
                icon="location_on"
                label="ที่อยู่"
                value={booking.shopAddress}
              />
            ) : null}
            {booking.shopContactPhone ? (
              <InfoRow
                icon="call"
                label="เบอร์ร้าน"
                value={
                  <a
                    href={`tel:${booking.shopContactPhone}`}
                    className="text-primary hover:underline"
                  >
                    {formatPhone(booking.shopContactPhone)}
                  </a>
                }
              />
            ) : null}
          </section>
        ) : null}

        <section className="bg-primary-container/15 border border-primary/20 rounded-2xl p-5 md:p-6">
          <div className="flex items-start gap-3">
            <Icon name="info" className="text-primary mt-0.5" />
            <div className="space-y-1">
              <p className="text-body-md text-on-surface font-bold">
                บันทึกหน้านี้ไว้
              </p>
              <p className="text-label-md text-on-surface-variant">
                กรุณาบันทึกลิงก์หน้านี้หรือถ่ายภาพหน้าจอเก็บไว้ ใช้เป็นหลักฐาน
                แสดงกับทางร้านในวันที่นัด
              </p>
            </div>
          </div>
        </section>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href={`/shops/${booking.shopId}`}
            className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full border-2 border-outline-variant text-on-surface-variant hover:bg-surface-container-high transition-colors text-label-md font-semibold"
          >
            <Icon name="storefront" />
            ดูหน้าร้าน
          </Link>
          <Link
            href="/"
            className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-primary text-on-primary hover:opacity-90 transition-opacity text-label-md font-semibold"
          >
            <Icon name="home" />
            กลับหน้าหลัก
          </Link>
        </div>
      </div>

      <LandingFooter />

      {showCustomerNav ? <CustomerBottomNav /> : null}
    </main>
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

function formatThaiDate(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const day = dt.getUTCDay();
  const dayLabel = THAI_DAY_LONG[day];
  const monthLabel = THAI_MONTH_LONG[m - 1];
  return `${dayLabel}ที่ ${d} ${monthLabel} ${y + 543}`;
}

function formatPhone(raw: string): string {
  if (raw.length === 10 && /^\d+$/u.test(raw)) {
    return `${raw.slice(0, 3)}-${raw.slice(3, 6)}-${raw.slice(6)}`;
  }
  return raw;
}

/**
 * Mask the booking owner's phone on this *shareable* page. The cancel/reschedule
 * flows require re-entering the full number, so printing it here would let anyone
 * with the link cancel the queue. We reveal the prefix + last 2 digits (enough for
 * the real owner to recognise their own booking) and hide the middle 5.
 * The shop's own contact phone is intentionally NOT masked — it's public.
 */
function maskPhone(raw: string): string {
  if (raw.length === 10 && /^\d+$/u.test(raw)) {
    return `${raw.slice(0, 3)}-XXX-XX${raw.slice(8)}`;
  }
  // Fallback for non-standard lengths: keep last 2, mask the rest.
  if (raw.length > 2) return `${"X".repeat(raw.length - 2)}${raw.slice(-2)}`;
  return "XX";
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

