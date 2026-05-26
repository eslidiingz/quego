import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { Chip } from "@/components/ui/Chip";
import { requireShopSession } from "@/lib/auth/shop-session-server";
import {
  getBookingContext,
  listBookingsByShop,
  type BookingListItem,
  type BookingStatus,
} from "@/lib/services/bookings";
import { cn } from "@/lib/cn";
import { TodayBookingRow } from "./TodayBookingRow";
import { NewBookingDialog } from "./bookings/NewBookingDialog";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "ภาพรวมร้าน · LuxeQueue",
};

const PREVIEW_LIMIT = 5;

type FilterKey = "confirmed" | "completed" | "cancelled" | "all";

// Ordering controls how mixed-status lists read: confirmed first (still
// actionable), then completed (done), then cancelled/no_show (history).
// Matches the left-to-right order of the summary tiles above the list.
const STATUS_ORDER: Record<BookingStatus, number> = {
  confirmed: 0,
  completed: 1,
  cancelled: 2,
  no_show: 2,
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
      return b.status === "cancelled" || b.status === "no_show";
    case "all":
      return true;
  }
}

type SearchParams = Promise<{ filter?: string }>;

export default async function ShopHomePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await requireShopSession();
  const { filter: rawFilter } = await searchParams;
  const filter = parseFilter(rawFilter);

  const [bookings, context] = await Promise.all([
    listBookingsByShop(session.shopId, "today"),
    getBookingContext(session.shopId),
  ]);

  const counts = {
    confirmed: bookings.filter((b) => b.status === "confirmed").length,
    completed: bookings.filter((b) => b.status === "completed").length,
    cancelled: bookings.filter(
      (b) => b.status === "cancelled" || b.status === "no_show",
    ).length,
  };

  const visible = bookings
    .filter((b) => matchesFilter(b, filter))
    .sort((a, b) => {
      const order = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
      return order !== 0 ? order : a.slotTime.localeCompare(b.slotTime);
    });

  const preview = visible.slice(0, PREVIEW_LIMIT);
  const overflow = Math.max(0, visible.length - PREVIEW_LIMIT);

  return (
    <div className="p-4 md:p-12 max-w-[1280px] mx-auto w-full space-y-stack-lg">
      <div>
        <p className="text-label-md text-secondary uppercase tracking-widest mb-1">
          ยินดีต้อนรับกลับมา
        </p>
        <h1 className="font-display text-headline-lg text-on-background">
          {session.shopName}
        </h1>
        <div className="mt-3">
          <Chip variant="premium">เข้าสู่ระบบสำเร็จ</Chip>
        </div>
      </div>

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
            label="ยืนยันแล้ว"
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
          <ul className="space-y-1">
            {preview.map((b) => (
              <TodayBookingRow key={b.id} booking={b} />
            ))}
            {overflow > 0 ? (
              <li>
                <Link
                  href="/shop/bookings?view=today"
                  className="block text-center text-label-md text-primary hover:underline pt-2"
                >
                  +{overflow} รายการ
                </Link>
              </li>
            ) : null}
          </ul>
        )}

        {counts.confirmed > 0 ? (
          <p className="text-label-sm text-on-surface-variant text-center pt-1">
            แตะที่แถว &ldquo;ยืนยันแล้ว&rdquo; เพื่อทำเครื่องหมายเสร็จสิ้น
          </p>
        ) : null}
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
