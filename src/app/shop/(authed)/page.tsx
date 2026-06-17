import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { requireShopSession } from "@/lib/auth/shop-session-server";
import {
  getBookingContext,
  listBookingsByShop,
  type BookingListItem,
  type BookingStatus,
} from "@/lib/services/bookings";
import { countWaitingForShopToday } from "@/lib/services/waitlist";
import { countOpenSlotsToday } from "@/lib/booking/slot-math";
import { cn } from "@/lib/cn";
import { getBangkokNow } from "@/lib/time/bangkok";
import { PageHeader } from "@/components/layout/PageHeader";
import { TodayBookingRow } from "./TodayBookingRow";
import { NewBookingDialog } from "./bookings/NewBookingDialog";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "ภาพรวมร้าน · Quego",
};

const PREVIEW_LIMIT = 5;

type FilterKey = "confirmed" | "completed" | "cancelled" | "all";

// Primary sort key: confirmed first (still actionable), then completed
// (done), then cancelled (history) — matching the left-to-right order of the
// summary tiles. Within each group, rows are then ordered by proximity to
// "now" (see the comparator in ShopHomePage): the next queue to arrive rises
// to the top, already-passed slots sink below.
const STATUS_ORDER: Record<BookingStatus, number> = {
  confirmed: 0,
  completed: 1,
  cancelled: 2,
};

function parseFilter(raw: string | undefined): FilterKey {
  if (raw === "confirmed" || raw === "completed" || raw === "cancelled") {
    return raw;
  }
  return "all";
}

function matchesFilter(b: BookingListItem, filter: FilterKey): boolean {
  switch (filter) {
    case "confirmed":
      return b.status === "confirmed";
    case "completed":
      return b.status === "completed";
    case "cancelled":
      return b.status === "cancelled";
    case "all":
      return true;
  }
}

type SearchParams = Promise<{ filter?: string; show?: string }>;

export default async function ShopHomePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await requireShopSession();
  const { filter: rawFilter, show: rawShow } = await searchParams;
  const filter = parseFilter(rawFilter);
  const showCount = Math.max(
    PREVIEW_LIMIT,
    Number.isFinite(Number(rawShow)) ? Number(rawShow) : PREVIEW_LIMIT,
  );

  // Today's bookings, the new-booking dialog's context, and the waitlist count
  // are independent reads, so they fan out concurrently.
  const [bookings, context, waitingCount] = await Promise.all([
    listBookingsByShop(session.shopId, "today"),
    getBookingContext(session.shopId),
    countWaitingForShopToday(session.shopId),
  ]);

  const counts = {
    confirmed: bookings.filter((b) => b.status === "confirmed").length,
    completed: bookings.filter((b) => b.status === "completed").length,
    cancelled: bookings.filter((b) => b.status === "cancelled").length,
  };

  // "Now" in Bangkok, as "HH:MM" — same fixed-width shape as slotTime, so a
  // plain string compare is already chronological.
  const now = getBangkokNow().timeHHMM;

  // Glance metrics (Q1): today's earned revenue (completed only; null prices
  // from walk-ins count as ฿0) + how many slots are still bookable until close.
  const revenueToday = bookings.reduce(
    (sum, b) => (b.status === "completed" ? sum + (b.servicePrice ?? 0) : sum),
    0,
  );
  const remainingSlots = context ? countOpenSlotsToday(context) : null;

  // The "next queue" (Q2): the soonest still-upcoming confirmed booking — gets
  // the highlighted treatment in the list. null when every confirmed slot has
  // already passed (no completed/cancelled row is ever picked as "next").
  const nextQueueId =
    bookings
      .filter((b) => b.status === "confirmed" && b.slotTime >= now)
      .sort((a, b) => a.slotTime.localeCompare(b.slotTime))[0]?.id ?? null;

  const visible = bookings
    .filter((b) => matchesFilter(b, filter))
    .sort((a, b) => {
      // 1. Actionable queue first (confirmed), then completed, then history.
      const order = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
      if (order !== 0) return order;
      // 2. Upcoming slots before already-passed ones, so the next queue to
      //    arrive sits at the very top (a slot at exactly "now" counts as
      //    upcoming).
      const aPast = a.slotTime < now;
      const bPast = b.slotTime < now;
      if (aPast !== bPast) return aPast ? 1 : -1;
      // 3. Upcoming: soonest first (ascending). Passed: most-recent first
      //    (descending) so a just-missed queue stays nearest the top.
      return aPast
        ? b.slotTime.localeCompare(a.slotTime)
        : a.slotTime.localeCompare(b.slotTime);
    });

  const preview = visible.slice(0, showCount);
  const overflow = Math.max(0, visible.length - showCount);

  return (
    <div className="p-4 md:p-12 max-w-[1280px] mx-auto w-full space-y-stack-md">
      <PageHeader
        eyebrow="ยินดีต้อนรับสู่ร้าน"
        title={session.shopName}
        description="ภาพรวมคิวและการจองของร้านวันนี้"
      />

      {waitingCount > 0 ? <WaitlistCard count={waitingCount} /> : null}

      <section className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 md:p-6 space-y-stack-md">
        <header className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-label-md text-secondary uppercase tracking-widest">
              วันนี้
            </p>
            <Link
              href="/shop/bookings?view=today"
              className="text-label-md text-primary hover:underline"
            >
              ดูทั้งหมด →
            </Link>
          </div>
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-headline-md text-on-surface">
              การจองวันนี้
            </h2>
            {context ? (
              <NewBookingDialog context={context} triggerSize="sm" />
            ) : null}
          </div>
        </header>

        {/* Glance stats (Q1): read-only — visually distinct from the filter
            tiles below (no border/click affordance) so the owner never mistakes
            them for a filter. */}
        <div className="grid grid-cols-2 gap-3">
          <GlanceStat
            icon="payments"
            label="ยอดวันนี้"
            value={`฿${revenueToday.toLocaleString("th-TH")}`}
          />
          <GlanceStat
            icon="event_available"
            label="ที่ว่างเหลือ"
            value={remainingSlots == null ? "—" : `${remainingSlots} คิว`}
          />
        </div>

        <nav
          className="grid grid-cols-3 gap-3"
          aria-label="กรองตามสถานะ"
        >
          <FilterTile
            label="รอรับบริการ"
            value={counts.confirmed}
            tone="secondary"
            target="confirmed"
            current={filter}
          />
          <FilterTile
            label="เสร็จสิ้น"
            value={counts.completed}
            tone="success"
            target="completed"
            current={filter}
          />
          <FilterTile
            label="ยกเลิก"
            value={counts.cancelled}
            tone="error"
            target="cancelled"
            current={filter}
          />
        </nav>

        {bookings.length === 0 ? (
          <EmptyState kind="day-empty" />
        ) : visible.length === 0 ? (
          <EmptyState kind="filter-empty" />
        ) : (
          <ul className="space-y-2.5">
            {preview.map((b) => (
              <TodayBookingRow
                key={b.id}
                booking={b}
                now={now}
                isNext={b.id === nextQueueId}
              />
            ))}
            {overflow > 0 ? (
              <li>
                <Link
                  href={`/shop?${new URLSearchParams({ ...(filter !== "all" && { filter }), show: String(showCount + PREVIEW_LIMIT) })}`}
                  scroll={false}
                  className="mt-1 block rounded-xl border border-dashed border-outline-variant py-2.5 text-center text-label-md text-primary transition-colors hover:border-primary hover:bg-primary/5"
                >
                  ดูอีก {overflow} รายการ
                </Link>
              </li>
            ) : null}
          </ul>
        )}

      </section>
    </div>
  );
}

type Tone = "secondary" | "success" | "error";

// Every tile carries a fixed 1px border (matching the parent card + booking
// rows), so the three frames read as one set — corners and stroke weight never
// shift between tiles or between active/inactive. The *active* state is signalled
// by a tinted fill + a slightly stronger border colour, NOT by a thicker stroke,
// so the geometry stays perfectly balanced.
const TONE_STYLES: Record<
  Tone,
  { base: string; active: string }
> = {
  secondary: {
    base: "border-secondary/30 text-secondary hover:border-secondary hover:bg-secondary/5",
    active: "border-secondary bg-secondary/10 text-secondary",
  },
  success: {
    base: "border-success/30 text-success hover:border-success hover:bg-success/5",
    active: "border-success bg-success/10 text-success",
  },
  error: {
    base: "border-error/30 text-error hover:border-error hover:bg-error/5",
    active: "border-error bg-error/10 text-error",
  },
};

function FilterTile({
  label,
  value,
  tone,
  target,
  current,
}: {
  label: string;
  value: number;
  tone: Tone;
  target: Exclude<FilterKey, "all">;
  current: FilterKey;
}) {
  const isActive = current === target;
  // Clicking the active tile clears the filter (back to "all").
  const href = isActive ? "/shop" : `/shop?filter=${target}`;
  const styles = TONE_STYLES[tone];

  return (
    <Link
      href={href}
      scroll={false}
      aria-pressed={isActive}
      aria-label={`กรอง ${label} ${value} รายการ`}
      className={cn(
        "block rounded-xl border p-4 text-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        isActive ? styles.active : styles.base,
      )}
    >
      <p className="font-display text-display-sm leading-none">{value}</p>
      <p className="text-label-md mt-2 opacity-80">{label}</p>
    </Link>
  );
}

// Read-only glance stat (Q1): a soft pill with an icon, label, and value. No
// border or hover — deliberately unlike the clickable FilterTile so the owner
// reads it as information, not a control.
function GlanceStat({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-surface-container-low/60 px-3.5 py-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon name={icon} size={20} />
      </span>
      <div className="min-w-0">
        <p className="truncate text-label-sm text-on-surface-variant">{label}</p>
        <p className="truncate font-display text-headline-sm font-bold text-on-surface">
          {value}
        </p>
      </div>
    </div>
  );
}

// Waitlist glance card (Q4): surfaces how many customers are waiting for a slot
// to free up today, so the owner can proactively cancel a no-show and let the
// existing offer engine roll the slot on. Informational for now — a dedicated
// /shop/waitlist list is a follow-up.
function WaitlistCard({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-secondary/30 bg-secondary/5 px-4 py-3.5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary/15 text-secondary">
        <Icon name="hourglass_top" size={20} />
      </span>
      <p className="text-body-md text-on-surface">
        มี <span className="font-bold text-secondary">{count}</span>{" "}
        คนรอคิวว่างวันนี้
      </p>
    </div>
  );
}

function EmptyState({ kind }: { kind: "day-empty" | "filter-empty" }) {
  if (kind === "filter-empty") {
    return (
      <div className="flex flex-col items-center justify-center text-center py-8 gap-2">
        <Icon
          name="filter_alt_off"
          size={32}
          className="text-on-surface-variant"
        />
        <p className="text-body-md text-on-surface">
          ไม่มีรายการในสถานะนี้
        </p>
        <p className="text-label-md text-on-surface-variant">
          แตะการ์ดสรุปอีกครั้งเพื่อล้างตัวกรอง
        </p>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center text-center py-8 gap-2">
      <Icon
        name="event_available"
        size={32}
        className="text-on-surface-variant"
      />
      <p className="text-body-md text-on-surface">วันนี้ยังไม่มีการจอง</p>
      <p className="text-label-md text-on-surface-variant">
        การจองจากลูกค้าจะปรากฏที่นี่
      </p>
    </div>
  );
}
