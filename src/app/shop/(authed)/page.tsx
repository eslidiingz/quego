import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { requireShopSession } from "@/lib/auth/shop-session-server";
import {
  getBookingContext,
  listBookingsByShop,
  type BookingListItem,
  type BookingStatus,
} from "@/lib/services/bookings";
import { cn } from "@/lib/cn";
import { getBangkokNow } from "@/lib/time/bangkok";
import { PageHeader } from "@/components/layout/PageHeader";
import { TodayBookingRow } from "./TodayBookingRow";
import { NewBookingDialog } from "./bookings/NewBookingDialog";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "ภาพรวมร้าน · queva",
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

  // Today's bookings + the new-booking dialog's context are independent reads,
  // so they fan out concurrently.
  const [bookings, context] = await Promise.all([
    listBookingsByShop(session.shopId, "today"),
    getBookingContext(session.shopId),
  ]);

  const counts = {
    confirmed: bookings.filter((b) => b.status === "confirmed").length,
    completed: bookings.filter((b) => b.status === "completed").length,
    cancelled: bookings.filter((b) => b.status === "cancelled").length,
  };

  // "Now" in Bangkok, as "HH:MM" — same fixed-width shape as slotTime, so a
  // plain string compare is already chronological.
  const now = getBangkokNow().timeHHMM;

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
              <TodayBookingRow key={b.id} booking={b} />
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

const TONE_STYLES: Record<
  Tone,
  { base: string; active: string }
> = {
  secondary: {
    base: "ring-1 ring-inset ring-secondary/40 text-secondary hover:ring-secondary",
    active: "ring-2 ring-inset ring-secondary bg-secondary/10 text-secondary",
  },
  success: {
    base: "ring-1 ring-inset ring-success/40 text-success hover:ring-success",
    active: "ring-2 ring-inset ring-success bg-success/10 text-success",
  },
  error: {
    base: "ring-1 ring-inset ring-error/40 text-error hover:ring-error",
    active: "ring-2 ring-inset ring-error bg-error/10 text-error",
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
      className={cn(
        "block rounded-xl p-4 text-center transition-all focus:outline-none",
        isActive ? styles.active : styles.base,
      )}
    >
      <p className="font-display text-display-sm leading-none">{value}</p>
      <p className="text-label-md mt-2 opacity-80">{label}</p>
    </Link>
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
