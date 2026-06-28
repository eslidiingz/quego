import { Icon } from "@/components/ui/Icon";
import type { BookingQueueStatus } from "@/lib/services/bookings";
import {
  formatQueueAheadLabel,
  formatWaitLabel,
} from "@/lib/booking/queue-format";

/**
 * Compact queue-position pill for a confirmed, same-day booking in the
 * "คิวของฉัน" list — surfaces the core "อีก N คิวก่อนถึงคุณ" value on the card so a
 * waiting customer sees their place without drilling in.
 *
 * Deliberately STATIC (server-rendered). Live ticking lives on the booking
 * detail page — one tap away, since the whole card links there — whose
 * `LiveBookingQueue` island polls every ~10s. Keeping the list static avoids
 * multiplying server-action traffic across many cards (and tripping the queue
 * rate-limiter). The list page is `force-dynamic`, so this position is
 * recomputed fresh on every visit. Strings come from the shared pure formatters
 * so the list and the detail hero read identically.
 */
export function BookingQueueBadge({ status }: { status: BookingQueueStatus }) {
  const isNext = status.queueAhead <= 0;
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-container/15 px-3 py-1.5 text-primary">
      <Icon name="groups" size={16} className="shrink-0" aria-hidden="true" />
      <span className="text-label-md font-semibold tabular-nums">
        {formatQueueAheadLabel(status.queueAhead)}
      </span>
      {isNext ? null : (
        <span className="text-label-sm text-on-surface-variant tabular-nums">
          · {formatWaitLabel(status.estimatedWaitMinutes)}
        </span>
      )}
    </div>
  );
}
