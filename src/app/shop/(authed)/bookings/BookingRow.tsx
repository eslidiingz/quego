import Link from "next/link";
import { Chip } from "@/components/ui/Chip";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { formatBaht } from "@/lib/baht";
import { hhmmToMinutes } from "@/lib/booking/slot-math";
import type { BookingListItem } from "@/lib/services/bookings";
import { TOUR_ANCHORS } from "@/lib/tour/anchors";
import { CancelBookingByShopButton } from "./CancelBookingByShopButton";
import { CompleteBookingByShopButton } from "./CompleteBookingByShopButton";
import {
  STATUS_ACCENT,
  STATUS_META,
  cancelChipLabel,
  formatThaiDateFull,
} from "./bookingPresentation";

/**
 * Booking card for the /shop/bookings management list.
 *
 * Speaks the same visual language as the dashboard's TodayBookingRow — a time
 * block on the left, a status accent on the card's left edge, and live-signal
 * chips — but covers every tab. The per-card date is intentionally omitted: the
 * today tab needs none (all rows are today) and the other tabs group rows under
 * a date header in page.tsx. `now` is supplied ONLY on the today tab so the
 * "ถัดไป / เลยเวลา / กำลังมา" signals surface for the live working queue.
 *
 * SRP: presentation only. Status transitions + ownership checks live in the
 * server actions / service layer (reached through the two action buttons).
 */
export function BookingRow({
  booking,
  now,
  isNext = false,
}: {
  booking: BookingListItem;
  /** "HH:MM" in Bangkok — present only on the today tab (enables live signals). */
  now?: string;
  /** True for the soonest still-upcoming confirmed queue today. */
  isNext?: boolean;
}) {
  const meta = STATUS_META[booking.status];
  const isConfirmed = booking.status === "confirmed";
  const muted = booking.status === "cancelled";
  const code = booking.id.slice(0, 8).toUpperCase();

  // Live signals only make sense on today's working queue (now supplied).
  const overdueMin =
    now != null && isConfirmed && booking.slotTime < now
      ? hhmmToMinutes(now) - hhmmToMinutes(booking.slotTime)
      : 0;
  const isComing = now != null && isConfirmed && booking.comingAckAt != null;
  const showNext = now != null && isNext && isConfirmed;

  // Cancelled rows surface WHO cancelled (customer vs shop); other statuses
  // use the plain status label.
  const chipLabel = muted ? cancelChipLabel(booking.cancelledBy) : meta.label;

  return (
    <article
      // Every row carries the anchor; the tour spotlights the first in DOM order.
      data-tour={TOUR_ANCHORS.bookingsRow}
      className={cn(
        "bg-surface-container-lowest border border-outline-variant border-l-4 rounded-xl p-4 md:p-5 hover:shadow-tinted transition-shadow flex flex-col gap-3.5",
        STATUS_ACCENT[booking.status],
        muted && "opacity-70",
      )}
    >
      {/* ── Top zone: time block + customer/service/staff/signals ──────── */}
      <div className="flex items-start gap-3">
        <TimeBlock time={booking.slotTime} />

        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            {booking.customerPhone ? (
              <Link
                href={`/shop/customers/${booking.customerPhone}`}
                className="group inline-flex min-w-0 items-center gap-1 text-body-md font-bold text-on-surface hover:text-primary"
              >
                <span className="truncate">{booking.customerName}</span>
                <Icon
                  name="chevron_right"
                  size={16}
                  className="shrink-0 text-on-surface-variant group-hover:text-primary"
                />
              </Link>
            ) : (
              <p className="truncate text-body-md font-bold text-on-surface">
                {booking.customerName}
              </p>
            )}
            <Chip variant={meta.variant} size="sm" className="shrink-0">
              {chipLabel}
            </Chip>
          </div>

          {/* Service line — service/duration/price on the left, reference code
              pinned to the right rail on ≥sm so it lines up under the status
              chip without adding a tall third row. Price stays inline with the
              service (it's an attribute of the service, not a standalone
              figure). On mobile the code lives in the bottom row instead, so the
              right-rail code is `hidden sm:block`. When there's no service the
              row only renders on ≥sm (to carry the code) — never as an empty
              gap on mobile. */}
          <div
            className={cn(
              "flex items-start justify-between gap-2",
              !booking.serviceName && "hidden sm:flex",
            )}
          >
            {booking.serviceName ? (
              <p className="flex min-w-0 items-center gap-1.5 text-label-md text-on-surface-variant">
                <Icon name="design_services" size={16} className="shrink-0" />
                <span className="break-words">
                  {booking.serviceName} · {booking.serviceDurationMinutes} นาที
                  {booking.servicePrice != null
                    ? ` · ${formatBaht(booking.servicePrice)}`
                    : ""}
                </span>
              </p>
            ) : (
              <span aria-hidden="true" />
            )}
            <span
              aria-hidden="true"
              className="hidden shrink-0 text-label-sm text-on-surface-variant/60 sm:block"
            >
              #<span className="font-mono">{code}</span>
            </span>
          </div>

          {/* Staff line shares its row with the live-signal pills: staff text on
              the left (truncates), pills pinned to the right rail (wrap when more
              than one fires). The row still renders when there's no staff but a
              signal is active, so the pills never lose their home. */}
          {booking.staffName || showNext || overdueMin > 0 || isComing ? (
            <div className="flex items-start justify-between gap-2">
              {booking.staffName ? (
                <p className="flex min-w-0 items-center gap-1.5 text-label-md text-on-surface-variant">
                  <Icon name="person" size={16} className="shrink-0" />
                  <span className="truncate">
                    {booking.staffName}
                    {booking.staffRole ? ` · ${booking.staffRole}` : ""}
                  </span>
                </p>
              ) : (
                <span aria-hidden="true" />
              )}
              {showNext || overdueMin > 0 || isComing ? (
                <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                  {showNext ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-label-sm font-semibold text-on-primary">
                      <Icon name="arrow_forward" size={13} className="shrink-0" />
                      ถัดไป
                    </span>
                  ) : null}
                  {overdueMin > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-error/10 px-2 py-0.5 text-label-sm font-semibold text-error">
                      <Icon name="schedule" size={13} className="shrink-0" />
                      เลยเวลา {overdueMin} นาที
                    </span>
                  ) : null}
                  {isComing ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-label-sm font-semibold text-success">
                      <Icon name="check_circle" size={13} className="shrink-0" />
                      กำลังมา
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {/* ── Bottom zone: phone + (confirmed) actions ───────────────────── */}
      <div className="flex flex-col gap-3 border-t border-outline-variant/60 pt-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2.5 sm:flex-1">
          <PhoneRow phone={booking.customerPhone} />
          {/* Mobile-only: code sits at the far right of this row. On ≥sm it
              moves up beside the status chip, so it's hidden here. */}
          <span
            aria-hidden="true"
            className="ml-auto shrink-0 text-label-sm text-on-surface-variant/70 sm:hidden"
          >
            #<span className="font-mono">{code}</span>
          </span>
        </div>
        {isConfirmed ? (
          <div
            data-tour={TOUR_ANCHORS.bookingsRowActions}
            className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-2 sm:shrink-0"
          >
            <CompleteBookingByShopButton
              bookingId={booking.id}
              customerName={booking.customerName}
              slotTime={booking.slotTime}
            />
            <CancelBookingByShopButton
              bookingId={booking.id}
              customerName={booking.customerName}
              slotTime={booking.slotTime}
            />
          </div>
        ) : null}
      </div>

      <p className="sr-only">
        {formatThaiDateFull(booking.bookingDate)} เวลา {booking.slotTime} น.
        รหัสการจอง {code}
      </p>
    </article>
  );
}

/**
 * Time block — the scan anchor on the left of every row. Mirrors the dashboard
 * TodayBookingRow block (saturated Sora numerals on a soft primary tint) so the
 * shop owner reads the slot time the same way across both surfaces.
 */
function TimeBlock({ time }: { time: string }) {
  return (
    <div
      aria-hidden="true"
      className="flex size-[77px] shrink-0 items-center justify-center rounded-lg bg-primary/10 px-2.5 leading-none"
    >
      <span className="font-display text-headline-md font-bold text-primary">
        {time}
      </span>
    </div>
  );
}

/**
 * Slim phone affordance: a single tap-to-call line (small icon + number) rather
 * than the old heavy round button + "เบอร์โทร" label — calling is a secondary
 * action, so it stays quiet. The whole row keeps a ≥44px tap target on mobile.
 */
function PhoneRow({ phone }: { phone: string | null }) {
  if (!phone) {
    return (
      <span className="inline-flex items-center gap-1.5 text-label-md text-on-surface-variant">
        <Icon name="phone_disabled" size={16} className="shrink-0" />
        ไม่ระบุเบอร์
      </span>
    );
  }
  return (
    <a
      href={`tel:${phone}`}
      aria-label={`โทรหาลูกค้า ${formatPhone(phone)}`}
      className="inline-flex min-h-[44px] items-center gap-2 text-on-surface transition-colors hover:text-primary"
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon name="phone" size={16} />
      </span>
      <span className="text-body-md font-medium">{formatPhone(phone)}</span>
    </a>
  );
}

function formatPhone(raw: string): string {
  if (raw.length === 10 && /^\d+$/u.test(raw)) {
    return `${raw.slice(0, 3)}-${raw.slice(3, 6)}-${raw.slice(6)}`;
  }
  return raw;
}
