"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { Toast } from "@/components/ui/Toast";
import {
  PendingShopsPanel,
  type PendingShopNotice,
} from "./PendingShopsPanel";
import { pollNewPendingShops } from "@/app/admin/(authed)/notifications/actions";

const POLL_INTERVAL_MS = 20_000;
/** Keep the dropdown bounded — older alerts fall off the bottom. */
const MAX_ITEMS = 20;

type ToastState = { id: number; message: string } | null;

/**
 * Live new-registration notifier for the admin area. Polls `pollNewPendingShops`
 * every ~20s with a server-supplied cursor, and on fresh pending shops: bumps
 * the header bell badge, shows a Toast, plays a short chime, and prepends the
 * shop to the bell dropdown so the admin sees *who* registered — so a new shop
 * can be approved promptly.
 *
 * Read model: each notice carries a `read` flag. Opening the bell does NOT
 * clear the badge — the count is the number of *unread* notices and only drops
 * when the admin opens a notice (navigating to that shop) or taps "อ่านทั้งหมด".
 *
 * SRP: owns all notification + read state and renders its own bell + dropdown +
 * Toast. It is dropped into `AdminShell`'s header, so the shell stays layout-
 * focused.
 *
 * `initialSinceIso` is the server's "now" at page load — the baseline cursor,
 * so only registrations that arrive AFTER load are announced (no historical
 * spam; the existing backlog is shown by the nav badge + dashboard instead).
 */
export function PendingShopsNotifier({
  initialSinceIso,
}: {
  initialSinceIso: string;
}) {
  const cursorRef = useRef(initialSinceIso);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const router = useRouter();

  const [items, setItems] = useState<PendingShopNotice[]>([]);
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [soundBlocked, setSoundBlocked] = useState(false);
  const toastSeq = useRef(0);

  // Badge count = unread notices. Opening the dropdown no longer resets it.
  const unread = items.reduce((n, i) => (i.read ? n : n + 1), 0);

  const markRead = (id: string) =>
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, read: true } : i)),
    );

  const markAllRead = () =>
    setItems((prev) => prev.map((i) => (i.read ? i : { ...i, read: true })));

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
        const { serverNowIso, shops } = await pollNewPendingShops(
          cursorRef.current,
        );
        if (cancelled) return;

        const fresh = shops.filter((s) => !seenIdsRef.current.has(s.id));
        for (const s of fresh) seenIdsRef.current.add(s.id);
        cursorRef.current = serverNowIso; // advance only on success

        if (fresh.length > 0) {
          // `fresh` is ascending by created_at — reverse so newest is on top.
          // New notices start unread.
          setItems((prev) =>
            [
              ...fresh
                .slice()
                .reverse()
                .map((s) => ({ ...s, read: false })),
              ...prev,
            ].slice(0, MAX_ITEMS),
          );
          toastSeq.current += 1;
          setToast({
            id: toastSeq.current,
            message:
              fresh.length === 1
                ? `มีร้านสมัครใหม่รออนุมัติ: ${fresh[0].name}`
                : `มีร้านสมัครใหม่ ${fresh.length} ร้านรออนุมัติ`,
          });
          void playChime();
          // Re-fetch the server-rendered counts in place (the nav badge, the
          // dashboard card, the moderation tabs) without a full reload. Client
          // state here (read flags, list) is preserved.
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
        // Opening the dropdown does NOT mark anything read — the badge persists
        // until a notice is opened or "อ่านทั้งหมด" is used.
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex items-center justify-center size-10 rounded-full text-on-surface-variant hover:bg-surface-container-high transition-colors"
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
          <PendingShopsPanel
            items={items}
            unreadCount={unread}
            onItemClick={(id) => {
              markRead(id);
              setOpen(false);
            }}
            onMarkAllRead={markAllRead}
            onViewAll={() => setOpen(false)}
          />
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
