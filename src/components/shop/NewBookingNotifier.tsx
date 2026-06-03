"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { Toast } from "@/components/ui/Toast";
import { NotificationPanel } from "./NotificationPanel";
import { pollNewBookings } from "@/app/shop/(authed)/notifications/actions";

const POLL_INTERVAL_MS = 15_000;
/** Keep the dropdown bounded — older alerts fall off the bottom. */
const MAX_ITEMS = 20;

type ToastState = { id: number; message: string } | null;
/** One booking alert, derived from the poll action so the shape stays in sync. */
type Alert = Awaited<ReturnType<typeof pollNewBookings>>["bookings"][number];

/**
 * Live new-booking notifier for the shop area. Polls `pollNewBookings` every
 * ~15s with a server-supplied cursor, and on fresh confirmed bookings: bumps
 * the header bell badge, shows a Toast, plays a short chime, and prepends the
 * booking to the bell dropdown so the shop can see *what* came in.
 *
 * SRP: owns all notification state and renders its own bell + dropdown + Toast.
 * It is dropped into `ShopShell`'s header slot, so the shell stays layout-only
 * and doesn't know this feature exists.
 *
 * `initialSinceIso` is the server's "now" at page load — the baseline cursor,
 * so only bookings that arrive AFTER load are announced (no historical spam).
 */
export function NewBookingNotifier({
  initialSinceIso,
}: {
  initialSinceIso: string;
}) {
  const cursorRef = useRef(initialSinceIso);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const router = useRouter();

  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<Alert[]>([]);
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [soundBlocked, setSoundBlocked] = useState(false);
  const toastSeq = useRef(0);

  async function playChime() {
    try {
      const ctx = (audioCtxRef.current ??= new AudioContext());
      if (ctx.state === "suspended") await ctx.resume();
      // Two soft notes — a recognisable "ding-dong" rather than a harsh beep.
      beep(ctx, 880, ctx.currentTime, 0.12);
      beep(ctx, 1174.66, ctx.currentTime + 0.13, 0.2);
      setSoundBlocked(false);
    } catch {
      // Autoplay blocked until the first user gesture — surface the affordance.
      setSoundBlocked(true);
    }
  }

  async function enableSound() {
    await playChime(); // runs inside a click → counts as a user gesture
  }

  useEffect(() => {
    let cancelled = false;

    async function tick() {
      if (document.hidden) return; // Page Visibility: do no work while hidden
      try {
        const { serverNowIso, bookings } = await pollNewBookings(
          cursorRef.current,
        );
        if (cancelled) return;

        const fresh = bookings.filter((b) => !seenIdsRef.current.has(b.id));
        for (const b of fresh) seenIdsRef.current.add(b.id);
        cursorRef.current = serverNowIso; // advance only on success

        if (fresh.length > 0) {
          // `fresh` is ascending by created_at — reverse so newest is on top.
          setItems((prev) =>
            [...fresh.slice().reverse(), ...prev].slice(0, MAX_ITEMS),
          );
          setUnread((n) => n + fresh.length);
          toastSeq.current += 1;
          setToast({
            id: toastSeq.current,
            message:
              fresh.length === 1
                ? `มีการจองใหม่: ${fresh[0].customerName} เวลา ${fresh[0].slotTime} น.`
                : `มีการจองใหม่ ${fresh.length} รายการ`,
          });
          void playChime();
          // Re-fetch the server-rendered list + counts in place (the dashboard
          // "การจองวันนี้" list and the /shop/bookings tabs) without a full
          // reload. Client state here (bell count, list, etc.) is preserved.
          router.refresh();
        }
      } catch {
        // Network/server hiccup: keep the cursor, keep polling. The missed
        // window is re-queried on the next successful tick.
      }
    }

    const intervalId = window.setInterval(tick, POLL_INTERVAL_MS);
    const onVisibility = () => {
      if (!document.hidden) void tick(); // catch up the moment we refocus
    };
    document.addEventListener("visibilitychange", onVisibility);
    void tick(); // immediate first poll

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibility);
    };
    // `router` from useRouter() is a stable reference, so this effect still
    // runs once (no duplicate intervals); listed only to satisfy the linter.
  }, [router]);

  // Dismiss the dropdown on outside-click or Escape (only wired while open).
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative flex items-center gap-1">
      {soundBlocked ? (
        <button
          type="button"
          onClick={enableSound}
          className="flex items-center gap-1 px-2.5 py-1 rounded-full text-label-sm font-semibold text-secondary hover:bg-secondary-container/30 transition-colors"
        >
          <Icon name="volume_up" size={18} />
          เปิดเสียงแจ้งเตือน
        </button>
      ) : null}

      <button
        type="button"
        aria-label={
          unread > 0 ? `การแจ้งเตือน (${unread} รายการใหม่)` : "การแจ้งเตือน"
        }
        aria-expanded={open}
        onClick={() => {
          // Opening clears the "unread" badge but keeps the list visible.
          setOpen((v) => !v);
          setUnread(0);
        }}
        className="relative inline-flex items-center justify-center p-2 rounded-full text-on-surface-variant hover:bg-surface-container-high transition-colors"
      >
        <Icon name="notifications" />
        {unread > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-error text-on-error text-[10px] font-bold flex items-center justify-center">
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-full mt-2 z-50">
          <NotificationPanel items={items} onViewAll={() => setOpen(false)} />
        </div>
      ) : null}

      {toast ? (
        <Toast
          key={toast.id}
          kind="info"
          message={toast.message}
          onDismiss={() => setToast(null)}
        />
      ) : null}
    </div>
  );
}

/** Schedule one enveloped sine note on the shared AudioContext. */
function beep(
  ctx: AudioContext,
  frequency: number,
  startTime: number,
  durationSeconds: number,
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = frequency;
  // Quick attack, smooth decay — avoids the click of a hard on/off.
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(0.15, startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + durationSeconds);
  osc.connect(gain).connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + durationSeconds + 0.02);
}
