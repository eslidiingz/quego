import { notFound } from "next/navigation";
import { requireShopSession } from "@/lib/auth/shop-session-server";
import {
  getCustomerHistoryForShop,
  type ShopCustomerBooking,
} from "@/lib/services/customer-crm";
import {
  getCustomerNote,
  isValidCustomerPhone,
} from "@/lib/services/customer-notes";
import { formatBaht } from "@/lib/baht";
import { PageHeader } from "@/components/layout/PageHeader";
import { Chip } from "@/components/ui/Chip";
import { Icon } from "@/components/ui/Icon";
import type { BookingStatus, CancelledBy } from "@/lib/services/bookings";
import { CustomerNoteForm } from "./CustomerNoteForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "ลูกค้า · quego",
};

type Params = Promise<{ phone: string }>;

export default async function ShopCustomerPage({
  params,
}: {
  params: Params;
}) {
  const session = await requireShopSession();
  const { phone: rawPhone } = await params;
  const phone = decodeURIComponent(rawPhone).trim();

  // A malformed phone can't have a booking — fail closed before touching the DB.
  if (!isValidCustomerPhone(phone)) notFound();

  const [history, savedNote] = await Promise.all([
    getCustomerHistoryForShop(session.shopId, phone),
    getCustomerNote(session.shopId, phone),
  ]);

  // Zero bookings ⇒ this phone is not a customer of THIS shop. 404 so a shop
  // can't enumerate arbitrary phone numbers through the URL.
  if (history.bookings.length === 0) notFound();

  const title = history.displayName ?? formatPhone(phone);

  return (
    <div className="p-4 md:p-12 max-w-[960px] mx-auto w-full space-y-stack-md">
      <PageHeader
        eyebrow="ลูกค้า"
        title={title}
        description={`เบอร์โทร ${formatPhone(phone)} · ประวัติการใช้บริการที่ร้านของคุณ`}
      />

      {/* ── Summary tiles ─────────────────────────────────────────── */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          icon="task_alt"
          label="ใช้บริการแล้ว"
          value={`${history.totalVisits}`}
          sub="ครั้งที่เสร็จสิ้น"
        />
        <StatTile
          icon="event_upcoming"
          label="คิวที่กำลังจะถึง"
          value={`${history.upcomingCount}`}
          sub="ที่ยังไม่ถึงเวลา"
        />
        <StatTile
          icon="event_busy"
          label="ยกเลิก"
          value={`${history.cancelledCount}`}
          sub="ครั้งที่ยกเลิก"
        />
        <StatTile
          icon="history"
          label="ลูกค้าตั้งแต่"
          value={history.firstVisit ? formatShortDate(history.firstVisit) : "—"}
          sub={
            history.lastVisit
              ? `ล่าสุด ${formatShortDate(history.lastVisit)}`
              : undefined
          }
        />
      </section>

      {/* ── Private note editor ───────────────────────────────────── */}
      <section className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm p-6 md:p-8 space-y-4">
        <header className="flex items-start gap-3 pb-4 border-b border-outline-variant/40">
          <span className="w-10 h-10 rounded-lg bg-primary-container/10 text-primary flex items-center justify-center shrink-0">
            <Icon name="sticky_note_2" />
          </span>
          <div>
            <h2 className="font-display text-headline-md text-on-surface">
              โน้ตลูกค้า
            </h2>
            <p className="text-label-md text-on-surface-variant mt-1">
              จดความชอบ ข้อควรระวัง หรือสิ่งที่ต้องจำเกี่ยวกับลูกค้ารายนี้
              {savedNote.updatedAt
                ? ` · แก้ไขล่าสุด ${formatDateTime(savedNote.updatedAt)}`
                : ""}
            </p>
          </div>
        </header>
        <CustomerNoteForm phone={phone} initialNote={savedNote.note} />
      </section>

      {/* ── Visit-history timeline ────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="font-display text-headline-md text-on-surface">
          ประวัติการจอง ({history.bookings.length})
        </h2>
        <ol className="space-y-3">
          {history.bookings.map((b) => (
            <HistoryRow key={b.id} booking={b} />
          ))}
        </ol>
      </section>
    </div>
  );
}

// ----- Summary tile -------------------------------------------------------

function StatTile({
  icon,
  label,
  value,
  sub,
}: {
  icon: string;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 space-y-1">
      <div className="flex items-center gap-1.5 text-on-surface-variant">
        <Icon name={icon} size={16} className="shrink-0" />
        <span className="text-label-sm uppercase tracking-wider">{label}</span>
      </div>
      <p className="font-display text-headline-md text-on-surface">{value}</p>
      {sub ? (
        <p className="text-label-sm text-on-surface-variant">{sub}</p>
      ) : null}
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

function HistoryRow({ booking }: { booking: ShopCustomerBooking }) {
  const chip = STATUS_CHIP[booking.status];
  const chipLabel =
    booking.status === "cancelled"
      ? cancelChipLabel(booking.cancelledBy)
      : chip.label;
  const muted = booking.status === "cancelled";

  return (
    <li
      className={`rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 ${muted ? "opacity-70" : ""}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex shrink-0 w-16 flex-col items-center justify-center rounded-xl bg-surface-container-low py-2 text-center">
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

function formatShortDate(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return `${d} ${THAI_MONTH_SHORT[m - 1]} ${y + 543}`;
}

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Bangkok",
  }).format(new Date(iso));
}

function formatPhone(raw: string): string {
  if (raw.length === 10 && /^\d+$/u.test(raw)) {
    return `${raw.slice(0, 3)}-${raw.slice(3, 6)}-${raw.slice(6)}`;
  }
  return raw;
}
