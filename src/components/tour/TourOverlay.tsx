"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import { computeTourLayout, TOUR_CARD_WIDTH } from "@/lib/tour/spotlight";
import type { Tour, TourEndReason } from "@/lib/tour/types";
import { TourCard } from "./TourCard";
import { useAnchorRect } from "./useAnchorRect";

/** Seed height so the very first frame lands close; corrected by ResizeObserver. */
const ESTIMATED_CARD_HEIGHT = 180;

/**
 * The guided-tour overlay: a viewport scrim with a cut-out around the current
 * step's anchor, plus the coachmark card positioned beside it.
 *
 * Portalled to `document.body` for the reason spelled out in CLAUDE.md — the
 * shop sidebar animates with `translate-x-*`, and any `transform` on an ancestor
 * becomes the containing block for `position: fixed`, which would trap the
 * overlay inside the 288px nav column.
 *
 * Unlike `Modal`, this deliberately does NOT lock body scroll: every step calls
 * `scrollIntoView` on its anchor, and a locked body would freeze the tour on
 * whatever was visible when it started.
 */
export function TourOverlay({
  tour,
  stepIndex,
  onPrev,
  onNext,
  onEnd,
}: {
  tour: Tour;
  stepIndex: number;
  onPrev: () => void;
  onNext: () => void;
  onEnd: (reason: TourEndReason) => void;
}) {
  const step = tour.steps[stepIndex];
  const { rect, radius } = useAnchorRect(step?.anchor);
  const [mounted, setMounted] = useState(false);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [cardHeight, setCardHeight] = useState(ESTIMATED_CARD_HEIGHT);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // SSR portal guard, same pattern as Modal.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    const read = () =>
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    read();
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  }, []);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      setCardHeight(el.getBoundingClientRect().height || ESTIMATED_CARD_HEIGHT);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onEnd("skipped");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onEnd]);

  // Pull focus to the card on every step so keyboard and screen-reader users
  // follow along instead of being left behind on the page underneath.
  useEffect(() => {
    cardRef.current?.focus();
  }, [stepIndex]);

  if (!mounted || !step || viewport.width === 0) return null;

  const cardWidth = Math.min(TOUR_CARD_WIDTH, viewport.width - 24);
  const layout = computeTourLayout({
    anchor: rect,
    card: { width: cardWidth, height: cardHeight },
    viewport,
    preferred: step.placement,
  });
  const centered = layout.mode === "centered";
  const body = centered ? (step.fallbackBody ?? step.body) : step.body;

  return createPortal(
    <div
      className={cn(
        "quego-fade-in fixed inset-0 z-[70]",
        centered && "tour-scrim",
      )}
      // Clicking anywhere outside the card advances — the same "keep going"
      // affordance as the next button, and it never traps the owner.
      onClick={() => onNext()}
      role="presentation"
    >
      {layout.spotlight ? (
        <div
          className="tour-spotlight"
          style={{
            top: layout.spotlight.top,
            left: layout.spotlight.left,
            width: layout.spotlight.width,
            height: layout.spotlight.height,
            borderRadius: radius,
          }}
        />
      ) : null}

      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-card-title"
        aria-describedby="tour-card-body"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={trapTab}
        style={{
          top: layout.card.top,
          left: layout.card.left,
          width: cardWidth,
        }}
        className="quego-pop-in fixed rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-luxury focus:outline-none"
      >
        <TourCard
          step={step}
          body={body}
          stepIndex={stepIndex}
          stepCount={tour.steps.length}
          onPrev={onPrev}
          onNext={onNext}
          onSkip={() => onEnd("skipped")}
          onCtaClick={() => onEnd("completed")}
        />
      </div>
    </div>,
    document.body,
  );
}

/** Keep Tab inside the card — the page beneath is scrim'd and not interactive. */
function trapTab(e: React.KeyboardEvent<HTMLDivElement>) {
  if (e.key !== "Tab") return;
  const focusables = e.currentTarget.querySelectorAll<HTMLElement>(
    'button, a[href], [tabindex]:not([tabindex="-1"])',
  );
  if (focusables.length === 0) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  const active = document.activeElement;
  if (e.shiftKey && (active === first || active === e.currentTarget)) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && active === last) {
    e.preventDefault();
    first.focus();
  }
}
