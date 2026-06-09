import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { getBangkokToday } from "@/lib/time/bangkok";
import type { ShopNotice } from "@/app/shop/(authed)/notifications/actions";

/** A shop notice plus its per-item read state (owned by the notifier). */
export type ShopNoticeItem = ShopNotice & { read: boolean };

/**
 * Deep-link to the bookings page (the shop's full list of bookings). Both a new
 * booking and a customer cancellation are visible there, so one target serves both.
 */
export function noticeHref(): string {
  return "/shop/bookings";
}

/** Per-kind presentation: icon + tinted avatar + the verb shown before the time. */
const KIND_STYLES: Record<
  ShopNotice["kind"],
  { icon: string; avatar: string; verb: string }
> = {
  new_booking: {
    icon: "event_available",
    avatar: "bg-primary-container/15 text-primary",
    verb: "จองคิว",
  },
  cancellation: {
    icon: "event_busy",
    avatar: "bg-error-container/30 text-error",
    verb: "ยกเลิกคิว",
  },
};

/**
 * Stable per-notice key. The same booking id can appear as both a new booking
 * AND (later) a cancellation, so `kind` must be part of the key/dedupe identity.
 */
export function noticeKey(notice: { kind: ShopNotice["kind"]; id: string }): string {
  return `${notice.kind}:${notice.id}`;
}

/**
 * Presentational dropdown for the shop's notification bell. Pure: it just
 * renders the supplied notices and dispatches intent via callbacks — all
 * polling/read state lives in `ShopNotifier`. Split out so the visual can be
 * exercised in isolation and so the notifier stays focused on data + behaviour.
 *
 * Renders a mixed feed: new bookings and customer-initiated cancellations,
 * distinguished per item by `kind` (see KIND_STYLES). Read model (mirrors the
 * admin's `PendingShopsPanel`): opening the bell does NOT mark anything read. A
 * notice clears only when the shop opens it (navigates to the bookings list) or
 * uses "อ่านทั้งหมด".
 */
export function NotificationPanel({
  items,
  unreadCount,
  onItemClick,
  onMarkAllRead,
  onViewAll,
}: {
  items: ShopNoticeItem[];
  /** Count of unread notices — drives the "อ่านทั้งหมด" affordance. */
  unreadCount: number;
  /** Fired when a notice is opened (mark it read + close). Navigation is the Link. */
  onItemClick: (key: string) => void;
  /** Mark every notice read without navigating. */
  onMarkAllRead: () => void;
  /** Fired when the footer "view all" link is followed (e.g. to close). */
  onViewAll?: () => void;
}) {
  return (
    <div className="w-80 max-w-[calc(100vw-2rem)] bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-luxury overflow-hidden">
      <div className="flex items-start justify-between gap-2 px-4 py-3 border-b border-outline-variant/60">
        <div className="min-w-0">
          <p className="font-display text-label-lg text-on-surface font-bold">
            การแจ้งเตือน
          </p>
          <p className="text-label-sm text-on-surface-variant">
            การจองและการยกเลิกระหว่างคุณออนไลน์
          </p>
        </div>
        {unreadCount > 0 ? (
          <button
            type="button"
            onClick={onMarkAllRead}
            className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-label-sm font-semibold text-primary hover:bg-surface-container-high transition-colors"
          >
            <Icon name="done_all" size={16} />
            อ่านทั้งหมด
          </button>
        ) : null}
      </div>

      {items.length === 0 ? (
        <div className="px-4 py-10 flex flex-col items-center gap-2 text-center text-on-surface-variant">
          <Icon name="notifications_off" size={32} className="opacity-50" />
          <p className="text-label-md">ยังไม่มีการแจ้งเตือนใหม่</p>
        </div>
      ) : (
        <ul className="max-h-80 overflow-y-auto divide-y divide-outline-variant/40">
          {items.map((n) => {
            const style = KIND_STYLES[n.kind];
            const key = noticeKey(n);
            return (
              <li key={key}>
                <Link
                  href={noticeHref()}
                  onClick={() => onItemClick(key)}
                  className={cn(
                    "flex items-start gap-3 px-4 py-3 transition-colors hover:bg-surface-container-high",
                    !n.read && "bg-primary-container/10",
                  )}
                >
                  <span
                    className={cn(
                      "w-9 h-9 rounded-full flex items-center justify-center shrink-0",
                      style.avatar,
                    )}
                  >
                    <Icon name={style.icon} size={20} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-label-md text-on-surface font-semibold truncate">
                      {n.customerName}
                    </p>
                    <p className="text-label-sm text-on-surface-variant truncate">
                      {style.verb} · {formatWhen(n.bookingDate, n.slotTime)}
                    </p>
                  </div>
                  {!n.read ? (
                    <span
                      aria-label="ยังไม่ได้อ่าน"
                      className="mt-1 size-2 rounded-full bg-primary shrink-0"
                    />
                  ) : null}
                </Link>
              </li>
            );
          })}
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
