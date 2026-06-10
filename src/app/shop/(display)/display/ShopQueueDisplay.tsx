"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { ShopDisplaySnapshot } from "@/lib/services/shop-display";
import type { DisplayQueueRow } from "@/lib/booking/queue-display";
import { pollShopDisplayQueue, callNextQueueAction } from "./queue-actions";

/**
 * Display cadence (~10s), matching the customer-facing `LiveBookingQueue` /
 * `LiveQueueStatus` so the kiosk and the customer's position view move together.
 */
const POLL_INTERVAL_MS = 10_000;

/**
 * OPP-07 — the full-screen waiting-room island for `/shop/display`. Seeds from
 * the server-rendered `initial`, then polls `pollShopDisplayQueue` every ~10s.
 *
 * Polling mirrors the house pattern (`LiveBookingQueue`): pause while hidden
 * (Page Visibility), an immediate first tick, a catch-up tick on refocus, a
 * `cancelled` guard, and a try/catch that KEEPS the last good value on any
 * network/server/rate-limit hiccup (never flashes an empty queue). A `rev`
 * counter bumps only when a displayed value changes, replaying the subtle
 * `.queva-fade-in`.
 *
 * "เรียกคิวถัดไป" completes the earliest-remaining booking via
 * `callNextQueueAction` (wrapped in `ConfirmDialog` — no native confirm). On
 * success we `router.refresh()` so the server re-renders the next snapshot
 * immediately rather than waiting for the next poll tick.
 *
 * SRP: owns only its polling + display state; the queue math + masking live in
 * the pure module / service, so this island just renders the snapshot.
 */
export function ShopQueueDisplay({
  initial,
  shopName,
}: {
  initial: ShopDisplaySnapshot;
  shopName: string;
}) {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<ShopDisplaySnapshot>(initial);
  const [rev, setRev] = useState(0);
  const latestRef = useRef<ShopDisplaySnapshot>(initial);

  useEffect(() => {
    let cancelled = false;

    async function tick() {
      if (document.hidden) return; // Page Visibility: no work while hidden
      try {
        const next = await pollShopDisplayQueue();
        if (cancelled) return;

        const prev = latestRef.current;
        const changed =
          prev.nowServing?.id !== next.nowServing?.id ||
          prev.nextToCallBookingId !== next.nextToCallBookingId ||
          prev.waitingCount !== next.waitingCount ||
          prev.upcoming.length !== next.upcoming.length ||
          prev.upcoming.some((r, i) => r.id !== next.upcoming[i]?.id);
        if (!changed) return; // unchanged → no re-render, no animation replay
        latestRef.current = next;
        setSnapshot(next);
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
  }, []);

  const { nowServing, upcoming, nextToCallBookingId, waitingCount } = snapshot;

  async function handleCallNext() {
    if (!nextToCallBookingId) return;
    await callNextQueueAction(nextToCallBookingId);
    // Pull the fresh server snapshot at once rather than waiting for the poll.
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-5 py-10 md:px-10 md:py-14">
      <header className="flex items-center justify-between gap-3">
        <div>
          <p className="text-label-md uppercase tracking-widest text-on-surface-variant">
            คิววันนี้
          </p>
          <h1 className="font-display text-headline-md font-semibold text-on-surface md:text-display-sm">
            {shopName}
          </h1>
        </div>
        <span className="inline-flex items-center gap-2 text-label-md text-on-surface-variant">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-secondary opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-secondary" />
          </span>
          อัปเดตอัตโนมัติ
        </span>
      </header>

      {nowServing ? (
        <div className="mt-8 flex flex-1 flex-col">
          <section className="relative overflow-hidden rounded-3xl border border-primary/20 bg-primary-container/15 px-6 py-10 text-center md:px-10 md:py-14">
            <p className="text-label-md uppercase tracking-[0.25em] text-primary md:text-body-md">
              กำลังเรียกคิว
            </p>
            <p
              key={`serving-time-${rev}`}
              className="queva-fade-in mt-4 font-display text-[64px] font-bold leading-none text-primary tabular-nums md:text-[120px]"
            >
              {nowServing.slotTime}
            </p>
            <p
              key={`serving-name-${rev}`}
              className="queva-fade-in mt-5 font-display text-headline-md font-semibold text-on-surface md:text-display-sm"
            >
              {nowServing.customerName}
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-body-md text-on-surface-variant md:text-headline-md">
              {nowServing.serviceName ? (
                <span className="inline-flex items-center gap-1.5">
                  <Icon name="content_cut" size={20} className="text-tertiary" />
                  {nowServing.serviceName}
                </span>
              ) : null}
              {nowServing.staffName ? (
                <span className="inline-flex items-center gap-1.5">
                  <Icon name="person" size={20} className="text-tertiary" />
                  {nowServing.staffName}
                </span>
              ) : null}
            </div>
          </section>

          <section className="mt-8">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-label-md uppercase tracking-widest text-on-surface-variant">
                คิวถัดไป
              </h2>
              <span className="text-label-md text-on-surface-variant tabular-nums">
                รออยู่ {waitingCount} คิว
              </span>
            </div>
            {upcoming.length > 0 ? (
              <ul className="mt-4 flex flex-col gap-3">
                {upcoming.map((row, index) => (
                  <UpcomingRow key={row.id} row={row} position={index + 1} />
                ))}
              </ul>
            ) : (
              <p className="mt-4 rounded-2xl border border-outline-variant bg-surface-container-low px-5 py-6 text-center text-body-md text-on-surface-variant">
                ไม่มีคิวถัดไป
              </p>
            )}
          </section>

          <div className="mt-auto pt-10">
            <ConfirmDialog
              trigger={
                <Button
                  type="button"
                  size="xl"
                  fullWidth
                  disabled={!nextToCallBookingId}
                  iconLeft={<Icon name="campaign" />}
                >
                  เรียกคิวถัดไป
                </Button>
              }
              title="เรียกคิวถัดไปหรือไม่?"
              description={
                nowServing
                  ? `คิว ${nowServing.slotTime} · ${nowServing.customerName} จะถูกบันทึกว่าใช้บริการเสร็จสิ้น`
                  : undefined
              }
              confirmLabel="เรียกคิวถัดไป"
              cancelLabel="ยังก่อน"
              onConfirm={handleCallNext}
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center py-20 text-center">
          <span className="flex size-20 items-center justify-center rounded-full bg-surface-container-high text-on-surface-variant">
            <Icon name="event_available" size={40} />
          </span>
          <p className="mt-6 font-display text-headline-md font-semibold text-on-surface">
            ยังไม่มีคิววันนี้
          </p>
          <p className="mt-2 text-body-md text-on-surface-variant">
            เมื่อมีลูกค้าจองคิว รายการจะแสดงที่นี่โดยอัตโนมัติ
          </p>
        </div>
      )}
    </main>
  );
}

/**
 * One upcoming row in the waiting-room list. Presentation only — kept small and
 * separate so the island stays focused on polling state (SRP).
 */
function UpcomingRow({
  row,
  position,
}: {
  row: DisplayQueueRow;
  position: number;
}) {
  return (
    <li className="flex items-center gap-4 rounded-2xl border border-outline-variant bg-surface-container-low px-5 py-4">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-container-high font-display text-label-md font-semibold text-on-surface-variant tabular-nums">
        {position}
      </span>
      <span className="font-display text-headline-md font-semibold text-on-surface tabular-nums">
        {row.slotTime}
      </span>
      <span className="min-w-0 flex-1 truncate text-body-md text-on-surface">
        {row.customerName}
      </span>
      {row.staffName ? (
        <span className="hidden shrink-0 items-center gap-1.5 text-label-md text-on-surface-variant sm:inline-flex">
          <Icon name="person" size={18} className="text-tertiary" />
          {row.staffName}
        </span>
      ) : null}
    </li>
  );
}
