import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { requireShopSession } from "@/lib/auth/shop-session-server";
import {
  countBookingsByShop,
  getBookingContext,
  listBookingsByShop,
  type BookingListItem,
  type BookingsFilter,
} from "@/lib/services/bookings";
import { getBangkokNow } from "@/lib/time/bangkok";
import { PageHeader } from "@/components/layout/PageHeader";
import { TourHelpButton } from "@/components/tour/TourHelpButton";
import { BookingRow } from "./BookingRow";
import { BookingsTabs } from "./BookingsTabs";
import { NewBookingDialog } from "./NewBookingDialog";
import { formatThaiDateFull } from "./bookingPresentation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "รายการจอง · Quego",
};

/** Shop's booking context (services/staff/hours) or null when not bookable. */
type BookingCtx = Awaited<ReturnType<typeof getBookingContext>>;

const VALID_VIEWS: Record<BookingsFilter, true> = {
  today: true,
  upcoming: true,
  past: true,
  all: true,
};

function parseView(raw: string | undefined): BookingsFilter {
  if (raw && raw in VALID_VIEWS) return raw as BookingsFilter;
  return "today";
}

type SearchParams = Promise<{ view?: string }>;

export default async function ShopBookingsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await requireShopSession();
  const { view: rawView } = await searchParams;
  const view = parseView(rawView);

  // Rows, tab counts, and the new-booking dialog context are independent reads,
  // so they fan out concurrently.
  const [rows, counts, context] = await Promise.all([
    listBookingsByShop(session.shopId, view),
    countBookingsByShop(session.shopId),
    getBookingContext(session.shopId),
  ]);

  const isToday = view === "today";
  // "Now" in Bangkok as "HH:MM" — same fixed-width shape as slotTime, so a plain
  // string compare is already chronological. Drives the live signals on cards.
  const now = getBangkokNow().timeHHMM;
  // The soonest still-upcoming confirmed queue today gets the "ถัดไป" badge;
  // null once every confirmed slot has passed (mirrors the dashboard).
  const nextQueueId = isToday
    ? (rows
        .filter((b) => b.status === "confirmed" && b.slotTime >= now)
        .sort((a, b) => a.slotTime.localeCompare(b.slotTime))[0]?.id ?? null)
    : null;

  return (
    <div className="p-4 md:p-12 max-w-[1280px] mx-auto w-full space-y-stack-md">
      <PageHeader
        eyebrow="การจองของลูกค้า"
        title="รายการจอง"
        description="ติดตามคิวที่ลูกค้าจองเข้ามาที่ร้านของคุณ ทั้งคิววันนี้ คิวล่วงหน้า และประวัติย้อนหลัง"
        help={<TourHelpButton tourId="shop-bookings" />}
        action={
          context ? (
            <NewBookingDialog context={context} triggerSize="sm" />
          ) : undefined
        }
      />

      <BookingsTabs active={view} counts={counts} />

      {rows.length === 0 ? (
        <EmptyState view={view} context={context} />
      ) : isToday ? (
        <div className="space-y-3">
          {rows.map((b) => (
            <BookingRow
              key={b.id}
              booking={b}
              now={now}
              isNext={b.id === nextQueueId}
            />
          ))}
        </div>
      ) : (
        <DateGroupedList rows={rows} />
      )}
    </div>
  );
}

/**
 * Non-today tabs (upcoming / past / all) span multiple dates, so rows are
 * grouped under a date header instead of each card carrying its own date badge.
 * The service already orders rows chronologically, so consecutive same-date rows
 * form one contiguous group — a single pass is enough.
 */
function DateGroupedList({ rows }: { rows: BookingListItem[] }) {
  const groups: { date: string; items: BookingListItem[] }[] = [];
  for (const b of rows) {
    const last = groups[groups.length - 1];
    if (last && last.date === b.bookingDate) last.items.push(b);
    else groups.push({ date: b.bookingDate, items: [b] });
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <section key={group.date} className="space-y-3">
          <h2 className="flex items-center gap-2 px-1 text-label-md font-semibold text-on-surface-variant">
            <Icon name="event" size={16} className="shrink-0" />
            {formatThaiDateFull(group.date)}
          </h2>
          <div className="space-y-3">
            {group.items.map((b) => (
              <BookingRow key={b.id} booking={b} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

const EMPTY_COPY: Record<BookingsFilter, { title: string; body: string }> = {
  today: {
    title: "วันนี้ยังไม่มีคิวเข้ามา",
    body: "เพิ่มการจองให้ลูกค้าหน้าร้าน หรือแชร์ลิงก์ให้ลูกค้าจองเองได้เลย",
  },
  upcoming: {
    title: "ยังไม่มีการจองล่วงหน้า",
    body: "แชร์ลิงก์ร้านให้ลูกค้าจองคิวล่วงหน้าได้",
  },
  past: {
    title: "ยังไม่มีประวัติการจอง",
    body: "การจองที่ผ่านมาจะถูกเก็บไว้ที่นี่ให้ดูย้อนหลัง",
  },
  all: {
    title: "ยังไม่มีการจองในระบบ",
    body: "การจองจากลูกค้าจะปรากฏที่นี่เมื่อมีคนจองคิวร้านของคุณ",
  },
};

/**
 * Per-tab empty state. The today/upcoming tabs do product work — they prompt
 * the owner to add a walk-in (when the shop is bookable) and to share the
 * booking link — instead of dead-ending on a passive message.
 */
function EmptyState({
  view,
  context,
}: {
  view: BookingsFilter;
  context: BookingCtx;
}) {
  const icon = view === "past" ? "history" : "event_busy";
  const copy = EMPTY_COPY[view];
  const hasCta = view === "today" || view === "upcoming";

  return (
    <div className="bg-surface-container-lowest border border-dashed border-outline-variant rounded-xl p-10 md:p-12 text-center space-y-4">
      <div className="w-16 h-16 mx-auto rounded-full bg-secondary-container/40 text-on-secondary-container flex items-center justify-center">
        <Icon name={icon} size={32} />
      </div>
      <div className="space-y-1.5">
        <h2 className="font-display text-headline-md text-on-surface">
          {copy.title}
        </h2>
        <p className="text-body-md text-on-surface-variant max-w-md mx-auto">
          {copy.body}
        </p>
      </div>
      {hasCta ? (
        <div className="flex flex-col items-center justify-center gap-2.5 pt-1 sm:flex-row">
          {context ? <NewBookingDialog context={context} /> : null}
          <Link
            href="/shop/share"
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full border border-outline-variant px-4 text-label-md font-semibold text-on-surface-variant transition-colors hover:border-primary hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <Icon name="share" size={18} />
            แชร์ลิงก์รับจอง
          </Link>
        </div>
      ) : null}
    </div>
  );
}
