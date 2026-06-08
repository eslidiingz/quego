import Link from "next/link";
import { Chip } from "@/components/ui/Chip";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { getBangkokNow, getBangkokToday } from "@/lib/time/bangkok";
import { formatBaht } from "@/lib/baht";
import type {
  BookingStatus,
  CancelledBy,
  CustomerBookingItem,
} from "@/lib/services/bookings";
import { CancelBookingButton } from "./CancelBookingButton";
import { WriteReviewButton } from "@/components/reviews/WriteReviewButton";

const STATUS_MAP: Record<
  BookingStatus,
  { label: string; variant: "confirmed" | "success" | "danger" }
> = {
  confirmed: { label: "รอรับบริการ", variant: "confirmed" },
  completed: { label: "เสร็จสิ้น", variant: "success" },
  cancelled: { label: "ยกเลิก", variant: "danger" },
};

/**
 * Cancelled-status label from the customer's point of view: "คุณยกเลิก" when
 * they cancelled it themselves, "ร้านยกเลิก" when the shop did. Legacy rows
 * with an unknown source (cancelled_by = null) fall back to the plain "ยกเลิก".
 */
function cancelChipLabel(by: CancelledBy | null): string {
  if (by === "customer") return "คุณยกเลิก";
  if (by === "shop") return "ร้านยกเลิก";
  return "ยกเลิก";
}

export function BookingCard({ booking }: { booking: CustomerBookingItem }) {
  const status = STATUS_MAP[booking.status];
  const muted = booking.status === "cancelled";

  // A slot is "past" once its date+time has elapsed in Bangkok time. Past
  // bookings can no longer be cancelled by the customer, so we hide the button.
  // String compare is safe: both date (YYYY-MM-DD) and time (HH:MM) are
  // zero-padded and lexicographically ordered.
  const today = getBangkokToday();
  const nowHHMM = getBangkokNow().timeHHMM;
  const isPast =
    booking.bookingDate < today ||
    (booking.bookingDate === today && booking.slotTime < nowHHMM);
  const canCancel = booking.status === "confirmed" && !isPast;

  return (
    <article
      className={cn(
        "bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 md:p-6 hover:shadow-tinted transition-shadow space-y-4",
        muted && "opacity-70",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-2">
          <TimeBadge time={booking.slotTime} />
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-display text-headline-md text-on-surface">
              {booking.shopName}
            </h3>
            {booking.review ? (
              // A reviewed booking is necessarily completed; surface the more
              // informative "รีวิวแล้ว" state in place of the "เสร็จสิ้น" chip.
              <Chip
                variant="success"
                size="sm"
                iconLeft={<Icon name="check_circle" size={14} />}
              >
                รีวิวแล้ว
              </Chip>
            ) : (
              <Chip variant={status.variant} size="sm">
                {booking.status === "cancelled"
                  ? cancelChipLabel(booking.cancelledBy)
                  : status.label}
              </Chip>
            )}
          </div>
          {booking.serviceName ? (
            <p className="flex items-center gap-1.5 text-label-md text-on-surface-variant">
              <Icon name="design_services" size={16} className="shrink-0" />
              <span className="break-words">
                {booking.serviceName} · {booking.serviceDurationMinutes} นาที
                {booking.servicePrice != null
                  ? ` · ${formatBaht(booking.servicePrice)}`
                  : ""}
              </span>
            </p>
          ) : null}
          {booking.staffName ? (
            <p className="flex items-center gap-1.5 text-label-md text-on-surface-variant">
              <Icon name="person" size={16} className="shrink-0" />
              <span className="break-words">
                {booking.staffName}
                {booking.staffRole ? ` · ${booking.staffRole}` : ""}
              </span>
            </p>
          ) : null}
        </div>
        <DateBadge dateYmd={booking.bookingDate} />
      </div>

      {booking.shopAddress ? (
        <p className="flex items-start gap-2 text-body-md text-on-surface-variant">
          <Icon
            name="location_on"
            size={18}
            className="text-on-surface-variant shrink-0 mt-0.5"
          />
          <span className="min-w-0 break-words">{booking.shopAddress}</span>
        </p>
      ) : null}

      <p className="sr-only">
        {formatThaiDate(booking.bookingDate)} เวลา {booking.slotTime} น.
      </p>

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
        {canCancel ? <CancelBookingButton bookingId={booking.id} /> : null}
        {booking.status === "completed" ? (
          <WriteReviewButton
            bookingId={booking.id}
            shopName={booking.shopName}
            existing={booking.review}
          />
        ) : null}
        <Link
          href={`/bookings/${booking.id}`}
          className="border-2 border-outline-variant rounded-full px-4 h-11 text-on-surface-variant hover:bg-surface-container-low transition-colors text-label-md font-semibold flex items-center justify-center gap-2"
        >
          ดูรายละเอียดการจอง
          <Icon name="chevron_right" size={18} />
        </Link>
      </div>
    </article>
  );
}

function DateBadge({ dateYmd }: { dateYmd: string }) {
  const [y, m, d] = dateYmd.split("-").map(Number);
  const dayOfWeek = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return (
    <div
      aria-hidden="true"
      className="flex flex-col items-center gap-0.5 rounded-xl bg-surface-container-low py-2.5 px-3 text-center w-20"
    >
      <span className="text-label-sm font-bold uppercase tracking-widest text-on-surface-variant">
        {THAI_DAY_SHORT[dayOfWeek]}
      </span>
      <span className="font-display text-headline-md leading-none text-on-surface">
        {d}
      </span>
      <span className="text-label-sm text-on-surface-variant">
        {THAI_MONTH_SHORT[m - 1]}
      </span>
    </div>
  );
}

function TimeBadge({ time }: { time: string }) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary-container/15 text-primary"
    >
      <Icon name="schedule" size={16} />
      <span className="font-display text-headline-sm leading-none">{time}</span>
      <span className="text-label-md">น.</span>
    </span>
  );
}

function formatThaiDate(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const dayLabel = THAI_DAY_LONG[dt.getUTCDay()];
  const monthLabel = THAI_MONTH_SHORT[m - 1];
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

const THAI_DAY_SHORT = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];

const THAI_MONTH_SHORT = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
];
