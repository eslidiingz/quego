"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { cn } from "@/lib/cn";
import { TOUR_ANCHORS } from "@/lib/tour/anchors";
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
 * `.quego-fade-in`.
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

  const { nowServing, nowServingStarted, upcoming, nextToCallBookingId, waitingCount } =
    snapshot;

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
          <section
            data-tour={TOUR_ANCHORS.displayHero}
            className="relative overflow-hidden rounded-3xl border border-primary/20 bg-primary-container/15 px-6 py-10 text-center md:px-10 md:py-14"
          >
            <HeroEyebrow
              hasStarted={nowServingStarted}
              slotTime={nowServing.slotTime}
            />
            <p
              key={`serving-time-${rev}`}
              className="quego-fade-in mt-4 font-display text-[64px] font-bold leading-none text-primary tabular-nums md:text-[120px]"
            >
              {nowServing.slotTime}
            </p>
            <p
              key={`serving-name-${rev}`}
              className="quego-fade-in mt-5 font-display text-headline-md font-semibold text-on-surface md:text-display-sm"
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

          <section data-tour={TOUR_ANCHORS.displayUpcoming} className="mt-8">
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

          <div data-tour={TOUR_ANCHORS.displayCallNext} className="mt-auto pt-10">
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
 * Hero eyebrow + live indicator, varying by whether the shown booking has
 * actually begun. `active` (slot has arrived) → solid teal label + the coral
 * "live" pulse. `upcoming` (nothing started yet — the hero is just the soonest
 * booking) → a calmer muted label, a quiet static dot, and a "ยังไม่ถึงเวลา ·
 * เริ่ม HH:MM น." reframe so the giant future time can't read as in-progress.
 * Copy is centralised here (string-map pattern) for one place to tune wording.
 */
const HERO_EYEBROW: Record<
  "active" | "upcoming",
  { label: string; className: string }
> = {
  active: { label: "กำลังเรียกคิว", className: "text-primary" },
  upcoming: { label: "คิวถัดไปที่จะเรียก", className: "text-on-surface-variant" },
};

function HeroEyebrow({
  hasStarted,
  slotTime,
}: {
  hasStarted: boolean;
  slotTime: string;
}) {
  const { label, className } = HERO_EYEBROW[hasStarted ? "active" : "upcoming"];
  return (
    <div className="flex flex-col items-center gap-2">
      <span
        className={cn(
          "inline-flex items-center gap-2 text-label-md uppercase tracking-[0.25em] md:text-body-md",
          className,
        )}
      >
        <span className="relative flex h-2 w-2">
          {hasStarted ? (
            <>
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-secondary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-secondary" />
            </>
          ) : (
            <span className="relative inline-flex h-2 w-2 rounded-full bg-on-surface-variant/40" />
          )}
        </span>
        {label}
      </span>
      {!hasStarted ? (
        <span className="text-label-md text-on-surface-variant tabular-nums">
          ยังไม่ถึงเวลา · เริ่ม {slotTime} น.
        </span>
      ) : null}
    </div>
  );
}

/**
 * One upcoming row in the waiting-room list. Presentation only — kept small and
 * separate so the island stays focused on polling state (SRP).
 *
 * Layout: a fixed left anchor (position chip + big time) the room reads at a
 * glance, then a flexible block with the masked name above a service · staff
 * meta line. Service/staff each render only when present, so a single-lane
 * ("ใครก็ได้") or serviceless booking degrades cleanly to what it has — and the
 * staff name (the lane disambiguator) is no longer hidden behind a breakpoint,
 * so two customers sharing a slot time never look like a duplicate.
 */
function UpcomingRow({
  row,
  position,
}: {
  row: DisplayQueueRow;
  position: number;
}) {
  const hasMeta = row.serviceName || row.staffName;
  return (
    <li className="flex items-center gap-4 rounded-2xl border border-outline-variant bg-surface-container-low px-5 py-4">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-container-high font-display text-label-md font-semibold text-on-surface-variant tabular-nums">
        {position}
      </span>
      <span className="shrink-0 font-display text-headline-md font-semibold text-on-surface tabular-nums">
        {row.slotTime}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-body-md font-medium text-on-surface">
          {row.customerName}
        </p>
        {hasMeta ? (
          <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-0.5 text-label-md text-on-surface-variant">
            {row.serviceName ? (
              <span className="inline-flex min-w-0 items-center gap-1.5">
                <Icon
                  name="content_cut"
                  size={16}
                  className="shrink-0 text-tertiary"
                />
                <span className="truncate">{row.serviceName}</span>
              </span>
            ) : null}
            {row.staffName ? (
              <span className="inline-flex min-w-0 items-center gap-1.5">
                <Icon name="person" size={16} className="shrink-0 text-tertiary" />
                <span className="truncate">{row.staffName}</span>
              </span>
            ) : null}
          </p>
        ) : null}
      </div>
    </li>
  );
}
