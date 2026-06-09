"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import type { BookingQueueStatus } from "@/lib/services/bookings";
import { pollBookingQueueStatus } from "@/app/bookings/[id]/queue-actions";
import {
  formatQueueAheadLabel,
  formatWaitLabel,
} from "@/lib/booking/queue-format";

/**
 * Customer-facing live-queue cadence (~10s) — kept tighter than the staff
 * notifiers (~20s) so a waiting customer watching "อีก N คิวก่อนถึงคุณ" feels it
 * move. Same value as the shop-detail `LiveQueueStatus`.
 */
const POLL_INTERVAL_MS = 10_000;

/**
 * OPP-01 — the live queue-position hero on `/bookings/[id]`. Seeds from the
 * server-rendered `initial` (the page only mounts this when the booking is an
 * active, same-day confirmed one), then polls `pollBookingQueueStatus` every
 * ~10s and updates the headline ("อีก N คิวก่อนถึงคุณ" / "คุณคือคิวถัดไป") and the
 * estimated wait in place.
 *
 * Polling mirrors the house pattern (`LiveQueueStatus`): pause while hidden
 * (Page Visibility), an immediate first tick, a catch-up tick on refocus, a
 * `cancelled` guard, and a try/catch that KEEPS the last good value on any
 * network/server/rate-limit hiccup (never flashes a wrong position).
 *
 * When the shop completes or cancels the booking mid-watch, the poll returns
 * `active: false`; we `router.refresh()` once so the server re-renders the page
 * WITHOUT this panel (it gates on `active`), and render nothing meanwhile.
 *
 * SRP: owns only its polling + display state. The headline/wait strings come
 * from the shared pure formatters, so this island and the server format
 * identically (no hydration drift).
 */
export function LiveBookingQueue({
  bookingId,
  initial,
}: {
  bookingId: string;
  initial: BookingQueueStatus;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<BookingQueueStatus>(initial);
  // Bumped only when a displayed value actually changes, to replay the subtle
  // fade/rise (`.queva-fade-in`, reduced-motion-gated) via a changing key.
  const [rev, setRev] = useState(0);
  // Latest value, compared outside the setState updater so the updater stays
  // pure (no side effects under React 19 double-invoke).
  const latestRef = useRef<BookingQueueStatus>(initial);
  // Guard so we ask the server to re-render at most once when the queue ends.
  const refreshedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function tick() {
      if (document.hidden) return; // Page Visibility: no work while hidden
      try {
        const next = await pollBookingQueueStatus(bookingId);
        if (cancelled) return;

        // Booking left the live queue (shop completed/cancelled it): drop the
        // panel and let the server re-render the terminal state, just once.
        if (!next.active) {
          latestRef.current = next;
          setStatus(next);
          // Terminal — stop polling a dead booking immediately. Belt-and-braces:
          // the router.refresh() below also unmounts this island once the server
          // re-renders the page without the panel (it gates on `active`).
          window.clearInterval(intervalId);
          if (!refreshedRef.current) {
            refreshedRef.current = true;
            router.refresh();
          }
          return;
        }

        const prev = latestRef.current;
        const changed =
          prev.active !== next.active ||
          prev.queueAhead !== next.queueAhead ||
          prev.estimatedWaitMinutes !== next.estimatedWaitMinutes;
        if (!changed) return; // unchanged → no re-render, no animation replay
        latestRef.current = next;
        setStatus(next);
        setRev((r) => r + 1);
      } catch {
        // Network / server / rate-limit hiccup: keep the last good value.
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
  }, [bookingId, router]);

  // Terminal: nothing to show. The server re-render (above) removes the panel.
  if (!status.active) return null;

  const aheadLabel = formatQueueAheadLabel(status.queueAhead);
  const waitLabel = formatWaitLabel(status.estimatedWaitMinutes);

  return (
    <section className="relative overflow-hidden rounded-2xl border border-primary/20 bg-primary-container/15 p-5 md:p-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-label-sm uppercase tracking-widest text-on-surface-variant">
          สถานะคิวของคุณ
        </p>
        <span className="inline-flex items-center gap-1.5 text-label-sm text-on-surface-variant">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-secondary opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-secondary" />
          </span>
          อัปเดตอัตโนมัติ
        </span>
      </div>

      <p
        key={`ahead-${rev}`}
        className="queva-fade-in mt-3 font-display text-display-sm font-semibold leading-tight text-primary tabular-nums"
      >
        {aheadLabel}
      </p>

      <div className="mt-3 flex items-center gap-2 text-body-md text-on-surface-variant">
        <Icon name="schedule" size={18} className="text-tertiary" />
        <span>
          เวลารอโดยประมาณ{" "}
          <span
            key={`wait-${rev}`}
            className="queva-fade-in font-semibold text-on-surface tabular-nums"
          >
            {waitLabel}
          </span>
        </span>
      </div>
    </section>
  );
}
