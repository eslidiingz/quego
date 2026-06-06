import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { getBangkokToday } from "@/lib/time/bangkok";
import type { NewPendingShopAlert } from "@/lib/services/shops";

/** A registration alert plus its per-item read state (owned by the notifier). */
export type PendingShopNotice = NewPendingShopAlert & { read: boolean };

/** Deep-link to the moderation page, scrolled to the specific shop's card. */
export function noticeHref(id: string): string {
  return `/admin/shops?status=pending#shop-${id}`;
}

/**
 * Presentational dropdown for the admin's new-registration bell. Pure: it just
 * renders the supplied notices and dispatches intent via callbacks — all
 * polling/read state lives in `PendingShopsNotifier`.
 *
 * Read model: opening the bell does NOT mark anything read. A notice clears
 * only when the admin opens it (navigates to that shop) or uses "อ่านทั้งหมด".
 */
export function PendingShopsPanel({
  items,
  unreadCount,
  onItemClick,
  onMarkAllRead,
  onViewAll,
}: {
  items: PendingShopNotice[];
  /** Count of unread notices — drives the "อ่านทั้งหมด" affordance. */
  unreadCount: number;
  /** Fired when a notice is opened (mark it read + close). Navigation is the Link. */
  onItemClick: (id: string) => void;
  /** Mark every notice read without navigating. */
  onMarkAllRead: () => void;
  /** Fired when the footer link is followed (e.g. to close the dropdown). */
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
            ร้านที่สมัครเข้ามาใหม่และรอการอนุมัติ
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
          {items.map((s) => (
            <li key={s.id}>
              <Link
                href={noticeHref(s.id)}
                onClick={() => onItemClick(s.id)}
                className={cn(
                  "flex items-start gap-3 px-4 py-3 transition-colors hover:bg-surface-container-high",
                  !s.read && "bg-primary-container/10",
                )}
              >
                <span className="w-9 h-9 rounded-full bg-primary-container/15 text-primary flex items-center justify-center shrink-0">
                  <Icon name="storefront" size={20} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-label-md text-on-surface font-semibold truncate">
                    {s.name}
                  </p>
                  <p className="text-label-sm text-on-surface-variant truncate">
                    สมัครใหม่ · {s.ownerName}
                    {s.province ? ` · ${s.province}` : ""}
                  </p>
                  <p className="text-label-sm text-on-surface-variant/70">
                    {formatWhen(s.createdAt)}
                  </p>
                </div>
                {!s.read ? (
                  <span
                    aria-label="ยังไม่ได้อ่าน"
                    className="mt-1 size-2 rounded-full bg-primary shrink-0"
                  />
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Link
        href="/admin/shops?status=pending"
        onClick={onViewAll}
        className="flex items-center justify-center gap-1 px-4 py-3 text-label-md font-semibold text-primary border-t border-outline-variant/60 hover:bg-surface-container-high transition-colors"
      >
        ดูร้านที่รออนุมัติทั้งหมด
        <Icon name="arrow_forward" size={16} />
      </Link>
    </div>
  );
}

/**
 * "วันนี้ 14:30 น." for today, otherwise "DD/MM 14:30 น." — both projected into
 * Bangkok time (ICT) via Intl, matching the project's time conventions.
 * `createdAtIso` is a UTC ISO string from the DB.
 */
function formatWhen(createdAtIso: string): string {
  const at = new Date(createdAtIso);

  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Bangkok",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(at);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  let hour = get("hour");
  if (hour === "24") hour = "00";
  const time = `${hour}:${get("minute")}`;

  const isoDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);

  if (isoDate === getBangkokToday()) return `วันนี้ ${time} น.`;
  return `${get("day")}/${get("month")} ${time} น.`;
}
