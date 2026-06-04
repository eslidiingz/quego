import { Icon } from "@/components/ui/Icon";
import { requireShopSession } from "@/lib/auth/shop-session-server";
import {
  countBookingsByShop,
  getBookingContext,
  listBookingsByShop,
  type BookingsFilter,
} from "@/lib/services/bookings";
import { PageHeader } from "@/components/layout/PageHeader";
import { BookingRow } from "./BookingRow";
import { BookingsTabs } from "./BookingsTabs";
import { NewBookingDialog } from "./NewBookingDialog";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "รายการจอง · LuxeQueue",
};

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

  const [rows, counts, context] = await Promise.all([
    listBookingsByShop(session.shopId, view),
    countBookingsByShop(session.shopId),
    getBookingContext(session.shopId),
  ]);

  return (
    <div className="p-4 md:p-12 max-w-[1280px] mx-auto w-full space-y-stack-lg">
      <PageHeader
        eyebrow="การจองของลูกค้า"
        title="รายการจอง"
        description="ติดตามคิวที่ลูกค้าจองเข้ามาที่ร้านของคุณ ทั้งคิววันนี้ คิวล่วงหน้า และประวัติย้อนหลัง"
        action={context ? <NewBookingDialog context={context} triggerSize="sm" /> : undefined}
      />

      <BookingsTabs active={view} counts={counts} />

      {rows.length === 0 ? (
        <EmptyState view={view} />
      ) : (
        <div className="space-y-stack-md">
          {rows.map((booking) => (
            <BookingRow key={booking.id} booking={booking} />
          ))}
        </div>
      )}
    </div>
  );
}

const EMPTY_COPY: Record<BookingsFilter, string> = {
  today: "วันนี้ยังไม่มีการจอง",
  upcoming: "ยังไม่มีการจองล่วงหน้า",
  past: "ยังไม่มีประวัติการจอง",
  all: "ยังไม่มีการจองในระบบ",
};

function EmptyState({ view }: { view: BookingsFilter }) {
  const icon = view === "past" ? "history" : "event_busy";
  return (
    <div className="bg-surface-container-lowest border border-dashed border-outline-variant rounded-xl p-12 text-center space-y-3">
      <div className="w-16 h-16 mx-auto rounded-full bg-secondary-container/40 text-on-secondary-container flex items-center justify-center">
        <Icon name={icon} size={32} />
      </div>
      <h2 className="font-display text-headline-md text-on-surface">
        {EMPTY_COPY[view]}
      </h2>
      <p className="text-body-md text-on-surface-variant max-w-md mx-auto">
        การจองจากลูกค้าจะปรากฏที่นี่เมื่อมีคนจองคิวร้านของคุณ
      </p>
    </div>
  );
}
