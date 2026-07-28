import { notFound } from "next/navigation";
import { requireShopSession } from "@/lib/auth/shop-session-server";
import {
  getCustomerHistoryForShop,
  getShopCustomerContact,
} from "@/lib/services/customer-crm";
import {
  getCustomerNote,
  isValidCustomerPhone,
} from "@/lib/services/customer-notes";
import { getBookingContext } from "@/lib/services/bookings";
import { getBangkokToday } from "@/lib/time/bangkok";
import { formatBaht } from "@/lib/baht";
import { PageHeader } from "@/components/layout/PageHeader";
import { TourHelpButton } from "@/components/tour/TourHelpButton";
import { TOUR_ANCHORS } from "@/lib/tour/anchors";
import { Icon } from "@/components/ui/Icon";
import { NewBookingDialog } from "../../bookings/NewBookingDialog";
import { CustomerNoteForm } from "./CustomerNoteForm";
import { CustomerBookingHistory } from "./CustomerBookingHistory";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "ลูกค้า · Quego",
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

  const [history, savedNote, context, contact] = await Promise.all([
    getCustomerHistoryForShop(session.shopId, phone),
    getCustomerNote(session.shopId, phone),
    getBookingContext(session.shopId),
    getShopCustomerContact(phone),
  ]);

  // Zero bookings ⇒ this phone is not a customer of THIS shop. 404 so a shop
  // can't enumerate arbitrary phone numbers through the URL.
  if (history.bookings.length === 0) notFound();

  const title = history.displayName ?? formatPhone(phone);
  const today = getBangkokToday();

  // Split the timeline: confirmed = still-ahead queue; everything else is past.
  const upcoming = history.bookings.filter((b) => b.status === "confirmed");
  const past = history.bookings.filter((b) => b.status !== "confirmed");

  return (
    <div className="p-4 md:p-12 max-w-[960px] mx-auto w-full space-y-stack-md">
      <PageHeader
        eyebrow="ลูกค้า"
        title={title}
        help={<TourHelpButton tourId="shop-customer-detail" />}
        action={
          context ? (
            <NewBookingDialog
              context={context}
              triggerSize="sm"
              triggerLabel="จองให้ลูกค้า"
              triggerIcon="event_available"
              initialName={history.displayName ?? ""}
              initialPhone={phone}
            />
          ) : undefined
        }
        description={
          <span className="flex flex-col gap-1.5">
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <a
                href={`tel:${phone}`}
                className="inline-flex items-center gap-1.5 rounded font-medium text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                <Icon name="call" size={14} className="shrink-0" />
                {formatPhone(phone)}
              </a>
              {contact.lineLinked ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-secondary-container/50 px-2 py-0.5 text-label-sm font-semibold text-on-secondary-container">
                  <Icon name="forum" size={13} className="shrink-0" />
                  เชื่อม LINE แล้ว
                </span>
              ) : null}
            </span>
            <span>ประวัติการใช้บริการที่ร้านของคุณ</span>
          </span>
        }
      />

      {/* ── Summary tiles ─────────────────────────────────────────── */}
      <section
        data-tour={TOUR_ANCHORS.customerStats}
        className="grid grid-cols-2 gap-3 lg:grid-cols-3"
      >
        <StatTile
          icon="task_alt"
          label="ใช้บริการแล้ว"
          value={`${history.totalVisits}`}
          sub="ครั้งที่เสร็จสิ้น"
        />
        <StatTile
          icon="payments"
          label="ยอดใช้จ่ายสะสม"
          value={formatBaht(history.lifetimeSpend)}
          sub="จากบริการที่เสร็จสิ้น"
        />
        <StatTile
          icon="update"
          label="เห็นล่าสุด"
          value={
            history.lastCompletedVisit
              ? formatRelativeRecency(history.lastCompletedVisit, today)
              : "—"
          }
          sub={
            history.firstVisit
              ? `ลูกค้าตั้งแต่ ${formatShortDate(history.firstVisit)}`
              : "ยังไม่เคยมารับบริการ"
          }
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
      </section>

      {/* ── Private note editor ───────────────────────────────────── */}
      <section
        data-tour={TOUR_ANCHORS.customerNote}
        className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm p-6 md:p-8 space-y-4"
      >
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

      {/* ── Visit-history timeline (upcoming split out, past capped) ── */}
      <CustomerBookingHistory upcoming={upcoming} past={past} />
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

function formatShortDate(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return `${d} ${THAI_MONTH_SHORT[m - 1]} ${y + 543}`;
}

/**
 * "How long since the customer last actually came" as a coarse Thai phrase,
 * computed from two YYYY-MM-DD strings (both already Bangkok-local). More
 * actionable on a CRM than an absolute first-visit date — a quick read of who's
 * gone quiet. Parsed at UTC midnight so the day delta is timezone-stable.
 */
function formatRelativeRecency(ymd: string, todayYmd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const [ty, tm, td] = todayYmd.split("-").map(Number);
  const diffDays = Math.round(
    (Date.UTC(ty, tm - 1, td) - Date.UTC(y, m - 1, d)) / 86_400_000,
  );
  if (diffDays <= 0) return "วันนี้";
  if (diffDays === 1) return "เมื่อวาน";
  if (diffDays < 7) return `${diffDays} วันก่อน`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} สัปดาห์ก่อน`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} เดือนก่อน`;
  return `${Math.floor(diffDays / 365)} ปีก่อน`;
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
