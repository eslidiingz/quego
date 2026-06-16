import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/layout/PageHeader";
import { requireCustomerSession } from "@/lib/auth/customer-session-server";
import { listBookingsByCustomerPhone } from "@/lib/services/bookings";
import {
  BOOKING_PERIODS,
  BOOKING_PERIOD_LABELS,
  isBookingInPeriod,
  parseBookingPeriod,
  type BookingPeriod,
} from "@/lib/booking/period";
import { getBangkokToday } from "@/lib/time/bangkok";
import { BookingCard } from "./BookingCard";
import { BookingPeriodFilter } from "./BookingPeriodFilter";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "คิวของฉัน · quego",
};

type SearchParams = Promise<{ period?: string }>;

export default async function MyBookingsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await requireCustomerSession();
  const { period: rawPeriod } = await searchParams;
  const period = parseBookingPeriod(rawPeriod);

  const bookings = await listBookingsByCustomerPhone(session.phone);
  const today = getBangkokToday();

  // One pass to tally every period so each pill can show its own count without
  // re-filtering. The ordered list stays intact for the active period.
  const counts = Object.fromEntries(
    BOOKING_PERIODS.map((p) => [p, 0]),
  ) as Record<BookingPeriod, number>;
  for (const b of bookings) {
    for (const p of BOOKING_PERIODS) {
      if (isBookingInPeriod(b.bookingDate, p, today)) counts[p] += 1;
    }
  }

  const visible = bookings.filter((b) =>
    isBookingInPeriod(b.bookingDate, period, today),
  );

  return (
    <div className="max-w-3xl mx-auto w-full px-4 md:px-6 py-6 space-y-stack-md">
      <PageHeader
        eyebrow="การจองของฉัน"
        title="คิวของฉัน"
        description="ติดตามคิวที่คุณจองไว้ — ทั้งคิวล่วงหน้าและประวัติย้อนหลัง"
      />

      {bookings.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <BookingPeriodFilter current={period} counts={counts} />
          {visible.length === 0 ? (
            <NoMatchState period={period} />
          ) : (
            <ul className="space-y-4">
              {visible.map((b) => (
                <li key={b.id}>
                  <BookingCard booking={b} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function NoMatchState({ period }: { period: BookingPeriod }) {
  return (
    <div className="border-2 border-dashed border-outline-variant rounded-2xl px-6 py-10 flex flex-col items-center text-center gap-3 bg-surface-container-lowest">
      <span className="flex items-center justify-center w-14 h-14 rounded-full bg-surface-container-low text-on-surface-variant">
        <Icon name="event_busy" size={28} />
      </span>
      <p className="text-body-md text-on-surface-variant max-w-sm">
        ไม่มีการจองในช่วง “{BOOKING_PERIOD_LABELS[period]}”
      </p>
      <Link
        href="/me/bookings?period=all"
        className="text-label-md font-semibold text-primary hover:underline"
      >
        ดูการจองทั้งหมด
      </Link>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="border-2 border-dashed border-outline-variant rounded-2xl px-6 py-12 flex flex-col items-center text-center gap-3 bg-surface-container-lowest">
      <span className="flex items-center justify-center w-16 h-16 rounded-full bg-surface-container-low text-on-surface-variant">
        <Icon name="event_busy" size={32} />
      </span>
      <h2 className="font-display text-headline-md text-on-surface">
        ยังไม่มีการจอง
      </h2>
      <p className="text-body-md text-on-surface-variant max-w-sm">
        เมื่อคุณจองคิวร้าน รายการจะปรากฏที่นี่
      </p>
      <Link
        href="/"
        className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-on-primary text-label-md font-semibold hover:opacity-90 transition-opacity"
      >
        <Icon name="storefront" size={18} />
        เริ่มจองคิว
      </Link>
    </div>
  );
}
