import { Chip } from "@/components/ui/Chip";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import type { BookingListItem, BookingStatus } from "@/lib/services/bookings";
import { CancelBookingByShopButton } from "./CancelBookingByShopButton";
import { CompleteBookingByShopButton } from "./CompleteBookingByShopButton";

const STATUS_MAP: Record<
  BookingStatus,
  { label: string; variant: "confirmed" | "success" | "danger" }
> = {
  confirmed: { label: "รอรับบริการ", variant: "confirmed" },
  completed: { label: "เสร็จสิ้น", variant: "success" },
  cancelled: { label: "ยกเลิก", variant: "danger" },
  no_show: { label: "ไม่มาตามนัด", variant: "danger" },
};

export function BookingRow({ booking }: { booking: BookingListItem }) {
  const status = STATUS_MAP[booking.status];
  const muted = booking.status === "cancelled" || booking.status === "no_show";
  const code = booking.id.slice(0, 8).toUpperCase();

  return (
    <article
      className={cn(
        "bg-surface-container-lowest border border-outline-variant rounded-xl p-5 md:p-6 hover:shadow-tinted transition-shadow flex flex-col gap-4",
        muted && "opacity-70",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-2">
          <TimeBadge time={booking.slotTime} />
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-display text-headline-md text-on-surface">
              {booking.customerName}
            </h3>
            <Chip variant={status.variant} size="sm">
              {status.label}
            </Chip>
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
          <p className="text-label-sm text-on-surface-variant uppercase tracking-widest">
            รหัสการจอง <span className="font-mono normal-case tracking-normal">{code}</span>
          </p>
        </div>
        <DateBadge dateYmd={booking.bookingDate} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 sm:flex-1">
          <PhoneRow phone={booking.customerPhone} />
        </div>
        {booking.status === "confirmed" ? (
          <div className="flex items-center gap-2 sm:shrink-0">
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
        {formatThaiDate(booking.bookingDate)} เวลา {booking.slotTime} น.
      </p>
    </article>
  );
}

/**
 * Calendar-style date badge — mirrors the visual of the date chip in the
 * customer / manual booking picker so the shop owner reads the date the
 * same way across the app. Non-interactive (no click target needed —
 * the date is already locked in).
 */
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

/**
 * Inline time pill — placed below the booking code on the left column.
 * Bigger and more saturated than the surrounding metadata so the slot
 * time is the second thing the shop owner sees after the customer name.
 */
function TimeBadge({ time }: { time: string }) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary-container/15 text-primary"
    >
      <Icon name="schedule" size={16} />
      <span className="font-display text-headline-sm leading-none">
        {time}
      </span>
      <span className="text-label-md">น.</span>
    </span>
  );
}

/**
 * Specialised phone row: the icon doubles as a tap-to-call button so the
 * shop owner can dial the customer with one tap on mobile. Icon sized to
 * span both the "เบอร์โทร" label and the number for visual balance.
 */
function PhoneRow({ phone }: { phone: string | null }) {
  const Label = (
    <>
      <dt className="text-label-sm uppercase tracking-widest text-on-surface-variant">
        เบอร์โทร
      </dt>
      <dd className="text-body-md text-on-surface break-words">
        {phone ? formatPhone(phone) : (
          <span className="text-on-surface-variant">ไม่ระบุ</span>
        )}
      </dd>
    </>
  );

  if (phone) {
    return (
      <div className="flex items-center gap-3">
        <a
          href={`tel:${phone}`}
          aria-label={`โทรหาลูกค้า ${formatPhone(phone)}`}
          className="flex items-center justify-center w-11 h-11 rounded-full bg-primary-container/15 text-primary hover:bg-primary-container/25 active:bg-primary-container/35 transition-colors shrink-0"
        >
          <Icon name="phone" size={22} />
        </a>
        <div className="min-w-0">{Label}</div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="flex items-center justify-center w-11 h-11 rounded-full bg-surface-container-low text-on-surface-variant shrink-0">
        <Icon name="phone" size={22} />
      </span>
      <div className="min-w-0">{Label}</div>
    </div>
  );
}

function formatThaiDate(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const dayLabel = THAI_DAY_LONG[dt.getUTCDay()];
  const monthLabel = THAI_MONTH_SHORT[m - 1];
  return `วัน${dayLabel}ที่ ${d} ${monthLabel} ${y + 543}`;
}

function formatPhone(raw: string): string {
  if (raw.length === 10 && /^\d+$/u.test(raw)) {
    return `${raw.slice(0, 3)}-${raw.slice(3, 6)}-${raw.slice(6)}`;
  }
  return raw;
}

function formatBaht(price: number): string {
  return `${price.toLocaleString("th-TH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} บาท`;
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
