"use client";

import { useState } from "react";
import { Chip } from "@/components/ui/Chip";
import { Icon } from "@/components/ui/Icon";
import { formatBaht } from "@/lib/baht";
import type { ShopCustomerBooking } from "@/lib/services/customer-crm";
import type { BookingStatus, CancelledBy } from "@/lib/services/bookings";

/**
 * Visit timeline for the customer profile, split into two sections so the
 * owner's eye lands on what's actionable first:
 *
 *   1. "คิวที่กำลังจะถึง" — confirmed bookings still ahead, soonest first.
 *   2. "ประวัติการจอง"     — completed + cancelled, newest first, capped at
 *      {@link INITIAL_PAST} rows behind a "ดูเพิ่มเติม" toggle so a long
 *      history doesn't bury the note + tiles above.
 *
 * Client component only because of the show-more toggle; the rows themselves
 * are pure presentation over the server-shaped booking objects.
 */

const INITIAL_PAST = 8;

export function CustomerBookingHistory({
  upcoming,
  past,
}: {
  upcoming: ShopCustomerBooking[];
  past: ShopCustomerBooking[];
}) {
  const [expanded, setExpanded] = useState(false);

  // Upcoming queue reads best soonest-first (next appointment on top); the
  // server hands rows newest-first, so reverse a shallow copy.
  const upcomingSorted = [...upcoming].sort((a, b) =>
    `${a.bookingDate} ${a.slotTime}`.localeCompare(`${b.bookingDate} ${b.slotTime}`),
  );

  const visiblePast = expanded ? past : past.slice(0, INITIAL_PAST);
  const hiddenCount = past.length - visiblePast.length;

  return (
    <div className="space-y-8">
      {upcomingSorted.length > 0 ? (
        <section className="space-y-4">
          <h2 className="flex items-center gap-2 font-display text-headline-md text-on-surface">
            <Icon name="event_upcoming" size={20} className="shrink-0 text-primary" />
            คิวที่กำลังจะถึง ({upcomingSorted.length})
          </h2>
          <ol className="space-y-3">
            {upcomingSorted.map((b) => (
              <HistoryRow key={b.id} booking={b} accent />
            ))}
          </ol>
        </section>
      ) : null}

      <section className="space-y-4">
        <h2 className="flex items-center gap-2 font-display text-headline-md text-on-surface">
          <Icon name="history" size={20} className="shrink-0 text-on-surface-variant" />
          ประวัติการจอง ({past.length})
        </h2>
        {past.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-outline-variant bg-surface-container-lowest px-4 py-6 text-center text-label-md text-on-surface-variant">
            ยังไม่มีประวัติที่ผ่านมา
          </p>
        ) : (
          <>
            <ol className="space-y-3">
              {visiblePast.map((b) => (
                <HistoryRow key={b.id} booking={b} />
              ))}
            </ol>
            {hiddenCount > 0 ? (
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-3 text-label-md font-semibold text-on-surface-variant transition-colors hover:border-primary hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                <Icon name="expand_more" size={18} className="shrink-0" />
                ดูเพิ่มเติมอีก {hiddenCount} รายการ
              </button>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}

// ----- History row --------------------------------------------------------

const STATUS_CHIP: Record<
  BookingStatus,
  { label: string; variant: "confirmed" | "success" | "danger" }
> = {
  confirmed: { label: "รอรับบริการ", variant: "confirmed" },
  completed: { label: "เสร็จสิ้น", variant: "success" },
  cancelled: { label: "ยกเลิก", variant: "danger" },
};

function cancelChipLabel(by: CancelledBy | null): string {
  if (by === "customer") return "ลูกค้ายกเลิก";
  if (by === "shop") return "ร้านยกเลิก";
  return "ยกเลิก";
}

function HistoryRow({
  booking,
  accent = false,
}: {
  booking: ShopCustomerBooking;
  accent?: boolean;
}) {
  const chip = STATUS_CHIP[booking.status];
  const chipLabel =
    booking.status === "cancelled"
      ? cancelChipLabel(booking.cancelledBy)
      : chip.label;
  const muted = booking.status === "cancelled";

  return (
    <li
      className={`rounded-2xl border bg-surface-container-lowest p-4 ${
        accent ? "border-primary/40 ring-1 ring-primary/10" : "border-outline-variant"
      } ${muted ? "opacity-70" : ""}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex shrink-0 size-[70px] flex-col items-center justify-center rounded-lg bg-surface-container-low text-center">
          <span className="font-display text-headline-sm leading-none text-on-surface">
            {formatDay(booking.bookingDate)}
          </span>
          <span className="mt-1 text-label-sm text-on-surface-variant">
            {formatMonthYear(booking.bookingDate)}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="flex items-center gap-1.5 text-body-md font-bold text-on-surface">
              <Icon name="schedule" size={16} className="shrink-0 text-primary" />
              {booking.slotTime} น.
            </p>
            <Chip variant={chip.variant} size="sm" className="shrink-0">
              {chipLabel}
            </Chip>
          </div>

          <p className="mt-1 text-label-md text-on-surface-variant break-words">
            {booking.serviceName ?? "บริการ"} · {booking.serviceDurationMinutes}{" "}
            นาที
            {booking.servicePrice != null
              ? ` · ${formatBaht(booking.servicePrice)}`
              : ""}
          </p>

          {booking.staffName ? (
            <p className="mt-1 flex items-center gap-1.5 text-label-sm text-on-surface-variant">
              <Icon name="person" size={14} className="shrink-0" />
              <span className="break-words">{booking.staffName}</span>
            </p>
          ) : null}
        </div>
      </div>
    </li>
  );
}

// ----- Formatting (UTC-parsed so the calendar date stays intact) ----------

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

function formatDay(ymd: string): string {
  return String(Number(ymd.split("-")[2]));
}

function formatMonthYear(ymd: string): string {
  const [y, m] = ymd.split("-").map(Number);
  return `${THAI_MONTH_SHORT[m - 1]} ${(y + 543) % 100}`;
}
