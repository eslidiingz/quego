import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { requireCustomerSession } from "@/lib/auth/customer-session-server";
import { listBookingsByCustomerPhone } from "@/lib/services/bookings";
import { BookingCard } from "./BookingCard";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "คิวของฉัน · LuxeQueue",
};

export default async function MyBookingsPage() {
  const session = await requireCustomerSession();
  const bookings = await listBookingsByCustomerPhone(session.phone);

  return (
    <div className="max-w-3xl mx-auto w-full px-4 md:px-6 py-6 space-y-stack-md">
      <header className="space-y-2">
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary-container/30 text-on-secondary-container text-label-sm uppercase tracking-widest">
          การจองของฉัน
        </span>
        <h1 className="font-display text-headline-lg text-on-background">
          คิวของฉัน
        </h1>
        <p className="text-body-md text-on-surface-variant">
          ติดตามคิวที่คุณจองไว้ — ทั้งคิวล่วงหน้าและประวัติย้อนหลัง
        </p>
      </header>

      {bookings.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="space-y-4">
          {bookings.map((b) => (
            <li key={b.id}>
              <BookingCard booking={b} />
            </li>
          ))}
        </ul>
      )}
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
