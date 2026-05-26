import { Chip } from "@/components/ui/Chip";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import type { BookingListItem, BookingStatus } from "@/lib/services/bookings";

const STATUS_MAP: Record<
  BookingStatus,
  { label: string; variant: "confirmed" | "success" | "danger" }
> = {
  confirmed: { label: "ยืนยันแล้ว", variant: "confirmed" },
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
        "bg-surface-container-lowest border border-outline-variant rounded-xl p-5 md:p-6 hover:shadow-tinted transition-shadow space-y-4",
        muted && "opacity-70",
      )}
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="font-display text-headline-md text-on-surface">
              {booking.customerName}
            </h3>
            <Chip variant={status.variant} size="sm">
              {status.label}
            </Chip>
          </div>
          <p className="text-label-sm text-on-surface-variant uppercase tracking-widest mt-1">
            รหัสการจอง <span className="font-mono normal-case tracking-normal">{code}</span>
          </p>
        </div>
      </div>

      <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-label-md">
        <DetailRow
          icon="event"
          label="วันที่นัด"
          value={formatThaiDate(booking.bookingDate)}
        />
        <DetailRow
          icon="schedule"
          label="เวลานัด"
          value={`${booking.slotTime} น. (ครั้งละ ${booking.serviceDurationMinutes} นาที)`}
        />
        <DetailRow
          icon="phone"
          label="เบอร์โทร"
          value={
            booking.customerPhone ? (
              <a
                href={`tel:${booking.customerPhone}`}
                className="text-primary hover:underline"
              >
                {formatPhone(booking.customerPhone)}
              </a>
            ) : (
              <span className="text-on-surface-variant">ไม่ระบุ</span>
            )
          }
        />
      </dl>
    </article>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2 text-on-surface-variant">
      <Icon name={icon} size={18} className="text-primary mt-0.5 shrink-0" />
      <div className="min-w-0">
        <dt className="text-label-sm uppercase tracking-widest">{label}</dt>
        <dd className="text-body-md text-on-surface break-words">{value}</dd>
      </div>
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

const THAI_DAY_LONG = [
  "อาทิตย์",
  "จันทร์",
  "อังคาร",
  "พุธ",
  "พฤหัสบดี",
  "ศุกร์",
  "เสาร์",
];

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
