"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import type { Tour, TourEndReason } from "@/lib/tour/types";
import { TourOverlay } from "./TourOverlay";

export type StartTourOptions = {
  /** Fired once when the tour finishes or is abandoned, whichever comes first. */
  onEnd?: (reason: TourEndReason) => void;
};

export type TourApi = {
  startTour: (id: string, options?: StartTourOptions) => void;
  endTour: (reason: TourEndReason) => void;
  isActive: boolean;
  activeTourId: string | null;
};

const TourContext = createContext<TourApi | null>(null);

export function useTour(): TourApi {
  const api = useContext(TourContext);
  if (!api) {
    throw new Error("useTour must be used inside a <TourProvider>");
  }
  return api;
}

type RunningTour = { tourId: string; stepIndex: number; path: string };

/**
 * Owns "which tour is running and which step are we on", and renders the
 * overlay while one is active.
 *
 * DIP: it takes the tour catalogue as a prop and knows nothing about shops, so
 * the same engine can serve any persona. `ShopTourProvider` is the binding that
 * supplies the shop registry.
 */
export function TourProvider({
  tours,
  children,
}: {
  tours: Record<string, Tour>;
  children: React.ReactNode;
}) {
  const [running, setRunning] = useState<RunningTour | null>(null);
  const pathname = usePathname();
  // Held in a ref, not state: the callback is fire-and-forget plumbing for the
  // caller, and re-rendering the whole subtree when it changes buys nothing.
  const onEndRef = useRef<StartTourOptions["onEnd"]>(undefined);

  const endTour = (reason: TourEndReason) => {
    setRunning(null);
    const callback = onEndRef.current;
    onEndRef.current = undefined;
    callback?.(reason);
  };

  const startTour = (id: string, options?: StartTourOptions) => {
    const tour = tours[id];
    if (!tour || tour.steps.length === 0) return;
    onEndRef.current = options?.onEnd;
    setRunning({ tourId: id, stepIndex: 0, path: pathname });
  };

  // Navigating away abandons the tour. Without this the spotlight would keep
  // hunting for an anchor that only exists on the page we just left — most
  // visibly right after a step's CTA link fires.
  useEffect(() => {
    if (running && running.path !== pathname) {
      const callback = onEndRef.current;
      onEndRef.current = undefined;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRunning(null);
      callback?.("skipped");
    }
  }, [pathname, running]);

  const tour = running ? tours[running.tourId] : null;

  const api: TourApi = {
    startTour,
    endTour,
    isActive: running !== null,
    activeTourId: running?.tourId ?? null,
  };

  const goPrev = () =>
    setRunning((prev) =>
      prev ? { ...prev, stepIndex: Math.max(0, prev.stepIndex - 1) } : prev,
    );

  // "Next" past the last step is how the tour completes — both the button
  // (labelled เสร็จสิ้น there) and a backdrop click land here.
  const goNext = () => {
    if (!running || !tour) return;
    if (running.stepIndex >= tour.steps.length - 1) {
      endTour("completed");
      return;
    }
    setRunning({ ...running, stepIndex: running.stepIndex + 1 });
  };

  return (
    <TourContext.Provider value={api}>
      {children}
      {tour && running ? (
        <TourOverlay
          tour={tour}
          stepIndex={running.stepIndex}
          onPrev={goPrev}
          onNext={goNext}
          onEnd={endTour}
        />
      ) : null}
    </TourContext.Provider>
  );
}
