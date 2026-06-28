import Link from "next/link";
import { Chip } from "@/components/ui/Chip";
import { Icon } from "@/components/ui/Icon";
import { buttonClassName } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { getBangkokNow, getBangkokToday } from "@/lib/time/bangkok";
import { isPastChangeCutoff } from "@/lib/booking/cutoff";
import { formatBaht } from "@/lib/baht";
import type {
  BookingQueueStatus,
  BookingStatus,
  CancelledBy,
  CustomerBookingItem,
} from "@/lib/services/bookings";
import { CancelBookingButton } from "./CancelBookingButton";
import { BookingQueueBadge } from "./BookingQueueBadge";
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

export function BookingCard({
  booking,
  initialQueue = null,
  featured = false,
}: {
  booking: CustomerBookingItem;
  /**
   * Server-computed live-queue seed for this booking; only passed for a
   * confirmed, same-day booking (else null). Seeds {@link BookingQueueBadge}.
   */
  initialQueue?: BookingQueueStatus | null;
  /** The customer's nearest upcoming booking — gets a primary-tinted highlight
   * and a "คิวถัดไปของคุณ" eyebrow so the next visit leads the list. */
  featured?: boolean;
}) {
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
  // Reschedule shares the shop's cutoff window with cancel; gate it with the
  // same pure math the detail page uses (defaults to "until the slot starts"
  // when the shop configures no cutoff).
  const canReschedule =
    booking.status === "confirmed" &&
    !isPastChangeCutoff(booking.bookingDate, booking.slotTime, booking.cutoffHours, {
      date: today,
      timeHHMM: nowHHMM,
    });
  // The live queue badge only makes sense for a confirmed booking happening
  // today that the server found to be active in its lane.
  const showQueue =
    booking.status === "confirmed" &&
    booking.bookingDate === today &&
    !!initialQueue?.active;
  // Call/directions help before an upcoming visit; hide them once it's past or
  // for completed/cancelled rows.
  const isUpcoming = booking.status === "confirmed" && !isPast;
  const mapsHref = booking.shopAddress
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        booking.shopAddress,
      )}`
    : null;

  // "จองอีกครั้ง" closes the retention loop on a finished/cancelled visit by
  // deep-linking back to the booking form with the same service + staff
  // prefilled (the form validates and degrades gracefully on stale ids). Falls
  // back to the shop page when the original service is unknown.
  const showRebook =
    booking.status === "completed" || booking.status === "cancelled";
  const rebookHref = booking.serviceId
    ? `/shops/${booking.shopId}/book?serviceId=${booking.serviceId}${
        booking.staffId ? `&staffId=${booking.staffId}` : ""
      }`
    : `/shops/${booking.shopId}`;

  // A relative "how soon" hint for an upcoming visit on a future day — today's
  // urgency is already carried by the live queue badge, so we skip it then.
  const daysUntil = daysFromToday(today, booking.bookingDate);
  const relativeLabel =
    isUpcoming && daysUntil >= 1
      ? daysUntil === 1
        ? "พรุ่งนี้"
        : `อีก ${daysUntil} วัน`
      : null;

  return (
    <article
      className={cn(
        "relative bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 md:p-6 hover:shadow-tinted transition-shadow",
        // Cancelled rows read as inactive via a recessed surface + the danger
        // chip — NOT a blanket opacity dim, which would drop body text below
        // the 4.5:1 contrast floor.
        muted && "bg-surface-container-low",
        // The nearest upcoming visit leads the list with a primary-tinted frame.
        featured && "border-primary/40 shadow-tinted",
      )}
    >
      {featured ? (
        <p className="flex items-center gap-1.5 text-label-sm font-semibold uppercase tracking-wide text-primary">
          <Icon name="bolt" size={14} className="shrink-0" />
          คิวถัดไปของคุณ
        </p>
      ) : null}

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <TimeBadge time={booking.slotTime} />
            {relativeLabel ? (
              <span className="inline-flex items-center rounded-full bg-secondary-fixed/40 px-2.5 py-0.5 text-label-sm font-semibold text-on-secondary-fixed">
                {relativeLabel}
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-display text-headline-md text-on-surface">
              {muted ? (
                booking.shopName
              ) : (
                // Stretched link: the ::before pseudo fills the relative
                // <article>, making the whole card tap to detail while the
                // action buttons (relative z-10) stay independently clickable.
                <Link
                  href={`/bookings/${booking.id}`}
                  className="transition-colors hover:text-primary focus:outline-none focus-visible:underline before:absolute before:inset-0 before:content-['']"
                >
                  {booking.shopName}
                </Link>
              )}
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
        {/* Right column: date badge + (sm+) rebook/review actions below it */}
        <div className="flex flex-col items-end gap-3 shrink-0">
          <DateBadge dateYmd={booking.bookingDate} />
          {showRebook ? (
            <div className="relative z-10 hidden sm:flex sm:flex-row sm:items-center gap-2">
              {booking.status === "completed" ? (
                <WriteReviewButton
                  bookingId={booking.id}
                  shopName={booking.shopName}
                  existing={booking.review}
                />
              ) : null}
              <Link
                href={rebookHref}
                className={buttonClassName({ variant: "primary", size: "md" })}
              >
                <Icon name="event_repeat" size={18} />
                จองอีกครั้ง
              </Link>
            </div>
          ) : null}
        </div>
      </div>

      {showQueue && initialQueue ? (
        <BookingQueueBadge status={initialQueue} />
      ) : null}

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

      {/* Bottom utility bar: contact links on the left, action buttons on the right.
          On mobile the two groups stack (actions first, contact below); on sm+ they
          share a single row. z-10 lifts both over the stretched card link so every
          button/anchor stays independently clickable. */}
      {(isUpcoming && (booking.shopContactPhone || mapsHref)) ||
      canReschedule ||
      canCancel ||
      showRebook ||
      booking.status === "completed" ? (
        <div className={cn(
          "relative z-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
          // When the only content is rebook/review (already shown in the right column on sm+),
          // hide this bar entirely on sm+ to avoid the empty-space gap.
          showRebook && !canCancel && !canReschedule && !isUpcoming && "sm:hidden",
        )}>
          {/* Contact — left side on sm+ */}
          {isUpcoming && (booking.shopContactPhone || mapsHref) ? (
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
              {booking.shopContactPhone ? (
                <a
                  href={`tel:${booking.shopContactPhone}`}
                  className="inline-flex items-center gap-1.5 min-h-[44px] text-label-md font-semibold text-primary hover:underline"
                >
                  <Icon name="call" size={18} />
                  โทรหาร้าน
                </a>
              ) : null}
              {mapsHref ? (
                <a
                  href={mapsHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 min-h-[44px] text-label-md font-semibold text-primary hover:underline"
                >
                  <Icon name="directions" size={18} />
                  เส้นทาง
                </a>
              ) : null}
            </div>
          ) : (
            <div />
          )}

          {/* Actions — right side on sm+ */}
          {canReschedule || canCancel || showRebook || booking.status === "completed" ? (
            <div className="flex flex-col-reverse sm:flex-row sm:flex-wrap sm:justify-end gap-3">
              {canCancel ? <CancelBookingButton bookingId={booking.id} /> : null}
              {canReschedule ? (
                <Link
                  href={`/bookings/${booking.id}/reschedule`}
                  className={buttonClassName({ variant: "outline", size: "md" })}
                >
                  <Icon name="edit_calendar" size={18} />
                  เลื่อนนัด
                </Link>
              ) : null}
              {showRebook ? (
                <Link
                  href={rebookHref}
                  className={cn(
                    buttonClassName({ variant: "primary", size: "md" }),
                    "sm:hidden",
                  )}
                >
                  <Icon name="event_repeat" size={18} />
                  จองอีกครั้ง
                </Link>
              ) : null}
              {booking.status === "completed" ? (
                <span className={showRebook ? "sm:hidden" : ""}>
                  <WriteReviewButton
                    bookingId={booking.id}
                    shopName={booking.shopName}
                    existing={booking.review}
                  />
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
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

/**
 * Whole-day delta between two "YYYY-MM-DD" Bangkok dates via UTC-midnight
 * arithmetic (host-timezone-independent). Positive = `date` is in the future.
 */
function daysFromToday(today: string, date: string): number {
  const [ay, am, ad] = today.split("-").map(Number);
  const [by, bm, bd] = date.split("-").map(Number);
  return Math.round(
    (Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000,
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
