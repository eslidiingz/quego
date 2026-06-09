"use client";

import { useEffect, useRef, useState } from "react";
import type { ShopQueueStatus } from "@/lib/services/bookings";
import { pollShopQueueStatus } from "@/app/shops/[id]/queue-actions";
import { formatWaitLabel } from "@/lib/booking/queue-format";

/**
 * Customer-facing live-queue cadence (~10s) — kept tighter than the staff
 * notifiers (ShopNotifier / PendingShopsNotifier, ~20s) so the queue
 * figures a waiting customer is watching feel responsive.
 */
const POLL_INTERVAL_MS = 10_000;

/**
 * Live "สถานะคิววันนี้" numbers on the public shop detail page. Seeds from the
 * server-rendered `initial` (correct first paint, no flash, SEO-safe), then
 * polls `pollShopQueueStatus` every ~10s and updates only the two figures —
 * `คิวที่รออยู่` and `เวลารอโดยประมาณ` — in place.
 *
 * Polling mirrors the house pattern (ShopNotifier): pause while the tab is
 * hidden (Page Visibility), an immediate first tick, a catch-up tick on refocus,
 * a `cancelled` guard, and a try/catch that KEEPS the last good value on any
 * network/server/rate-limit hiccup (never flashes zeros).
 *
 * SRP: owns only its polling + display state. Wait-label formatting is the
 * shared pure `formatWaitLabel`, so this island and the server format identically.
 */
export function LiveQueueStatus({
  shopId,
  initial,
}: {
  shopId: string;
  initial: ShopQueueStatus;
}) {
  const [status, setStatus] = useState<ShopQueueStatus>(initial);
  // Bumped only when a displayed value actually changes, to replay the subtle
  // fade/rise (`.queva-fade-in`, reduced-motion-gated) via a changing key.
  const [rev, setRev] = useState(0);
  // Latest value, compared outside the setState updater so the updater stays
  // pure (no side effects under React 19 double-invoke).
  const latestRef = useRef<ShopQueueStatus>(initial);

  useEffect(() => {
    let cancelled = false;

    async function tick() {
      if (document.hidden) return; // Page Visibility: no work while hidden
      try {
        const next = await pollShopQueueStatus(shopId);
        if (cancelled) return;
        const prev = latestRef.current;
        const changed =
          prev.waitingCount !== next.waitingCount ||
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
  }, [shopId]);

  const waitLabel = formatWaitLabel(status.estimatedWaitMinutes);

  return (
    <div className="grid grid-cols-2 gap-3 p-5 md:p-6">
      <div className="bg-surface-container-low rounded-xl p-4">
        <p className="text-label-md text-on-surface-variant">คิวที่รออยู่</p>
        <p
          key={`count-${rev}`}
          className="queva-fade-in font-display font-semibold text-[28px] text-secondary mt-0.5 tabular-nums"
        >
          {status.waitingCount} คิว
        </p>
      </div>
      <div className="bg-surface-container-low rounded-xl p-4">
        <p className="text-label-md text-on-surface-variant">เวลารอโดยประมาณ</p>
        <p
          key={`wait-${rev}`}
          className="queva-fade-in font-display font-semibold text-[28px] text-tertiary mt-0.5 tabular-nums"
        >
          {waitLabel}
        </p>
      </div>
    </div>
  );
}
