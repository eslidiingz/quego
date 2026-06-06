import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { getBangkokToday } from "@/lib/time/bangkok";
import type { NewBookingAlert } from "@/lib/services/bookings";

/**
 * Presentational dropdown for the shop's new-booking bell. Pure: it just
 * renders the supplied alerts — all polling/state lives in
 * `NewBookingNotifier`. Split out so the visual can be exercised in isolation
 * (which has no shop session to poll with) and so the notifier stays focused
 * on data + behaviour.
 */
export function NotificationPanel({
  items,
  onViewAll,
}: {
  items: NewBookingAlert[];
  /** Fired when the footer "view all" link is followed (e.g. to close). */
  onViewAll?: () => void;
}) {
  return (
    <div className="w-80 max-w-[calc(100vw-2rem)] bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-luxury overflow-hidden">
      <div className="px-4 py-3 border-b border-outline-variant/60">
        <p className="font-display text-label-lg text-on-surface font-bold">
          การแจ้งเตือน
        </p>
        <p className="text-label-sm text-on-surface-variant">
          การจองใหม่ที่เข้ามาระหว่างคุณออนไลน์
        </p>
      </div>

      {items.length === 0 ? (
        <div className="px-4 py-10 flex flex-col items-center gap-2 text-center text-on-surface-variant">
          <Icon name="notifications_off" size={32} className="opacity-50" />
          <p className="text-label-md">ยังไม่มีการแจ้งเตือนใหม่</p>
        </div>
      ) : (
        <ul className="max-h-80 overflow-y-auto divide-y divide-outline-variant/40">
          {items.map((b) => (
            <li key={b.id} className="flex items-start gap-3 px-4 py-3">
              <span className="w-9 h-9 rounded-full bg-primary-container/15 text-primary flex items-center justify-center shrink-0">
                <Icon name="event_available" size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-label-md text-on-surface font-semibold truncate">
                  {b.customerName}
                </p>
                <p className="text-label-sm text-on-surface-variant">
                  จองคิว · {formatWhen(b.bookingDate, b.slotTime)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Link
        href="/shop/bookings"
        onClick={onViewAll}
        className="flex items-center justify-center gap-1 px-4 py-3 text-label-md font-semibold text-primary border-t border-outline-variant/60 hover:bg-surface-container-high transition-colors"
      >
        ดูรายการจองทั้งหมด
        <Icon name="arrow_forward" size={16} />
      </Link>
    </div>
  );
}

/** "วันนี้ 14:30 น." for today, otherwise "DD/MM 14:30 น." (Bangkok time). */
function formatWhen(bookingDate: string, slotTime: string): string {
  if (bookingDate === getBangkokToday()) return `วันนี้ ${slotTime} น.`;
  const [, month, day] = bookingDate.split("-");
  return `${day}/${month} ${slotTime} น.`;
}
