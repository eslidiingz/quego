"use client";

import { useSyncExternalStore } from "react";
import { pollMyOpenWaitlistCount } from "@/app/me/actions";

/**
 * Shared client-side store for the customer's "open waitlist slot" count, the
 * number behind the live badge on the รอคิว nav tab ({@link WaitlistNavBadge}).
 *
 * Why a singleton store rather than a per-component poller: the badge appears in
 * BOTH the mobile bottom bar and the desktop top bar, and both are mounted at
 * once (one is just CSS-hidden per breakpoint). A module-level store with
 * `useSyncExternalStore` means every mounted badge shares ONE polling loop and
 * ONE value — no duplicate network traffic, no drift between the two bars.
 *
 * Lifecycle: polling starts when the first badge subscribes and stops when the
 * last unsubscribes (so no work runs on pages without the nav). It pauses while
 * the tab is hidden (Page Visibility) and catches up immediately on refocus —
 * mirroring {@link ShopNotifier}. The count reflects `notified` entries, so the
 * badge persists until the customer books or leaves the list, not merely until
 * they glance at it.
 */

const POLL_INTERVAL_MS = 20_000;

let count = 0;
let intervalId: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

async function poll(): Promise<void> {
  // Page Visibility: do no work (and spend no quota) while the tab is hidden.
  if (typeof document !== "undefined" && document.hidden) return;
  try {
    const next = await pollMyOpenWaitlistCount();
    if (next !== count) {
      count = next;
      emit();
    }
  } catch {
    // Network/server hiccup: keep the last value and keep polling.
  }
}

function onVisibility(): void {
  if (!document.hidden) void poll();
}

function start(): void {
  if (intervalId !== null) return;
  void poll(); // immediate first read
  intervalId = setInterval(() => void poll(), POLL_INTERVAL_MS);
  document.addEventListener("visibilitychange", onVisibility);
}

function stop(): void {
  if (intervalId === null) return;
  clearInterval(intervalId);
  intervalId = null;
  document.removeEventListener("visibilitychange", onVisibility);
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (listeners.size === 1) start();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) stop();
  };
}

function getSnapshot(): number {
  return count;
}

/** SSR / first client render: nothing known yet, so the badge starts hidden. */
function getServerSnapshot(): number {
  return 0;
}

/** Live count of the customer's waitlist entries that now have an open slot. */
export function useWaitlistCount(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
