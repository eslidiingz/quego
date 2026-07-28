"use client";

import { useEffect, useState } from "react";
import type { Rect } from "@/lib/tour/spotlight";

export type AnchorGeometry = {
  /** Viewport-space box of the anchored element, or `null` when there is none. */
  rect: Rect | null;
  /** The element's own `border-radius`, so the cut-out matches pills and cards. */
  radius: string;
};

const NO_ANCHOR: AnchorGeometry = { rect: null, radius: "12px" };

/**
 * Resolve `[data-tour="<id>"]`, scroll it into view, and keep its viewport rect
 * fresh while the step is showing.
 *
 * Returns `{ rect: null }` when the step has no anchor or the element isn't on
 * the page — which is a normal state, not an error: empty-state screens drop
 * their list rows, and the tour falls back to a centered card.
 */
export function useAnchorRect(anchor: string | undefined): AnchorGeometry {
  const [geometry, setGeometry] = useState<AnchorGeometry>(NO_ANCHOR);

  useEffect(() => {
    if (!anchor) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setGeometry(NO_ANCHOR);
      return;
    }

    const el = document.querySelector<HTMLElement>(`[data-tour="${anchor}"]`);
    if (!el) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          `[tour] no element carries data-tour="${anchor}" on this page — falling back to a centered card`,
        );
      }
      setGeometry(NO_ANCHOR);
      return;
    }

    // "instant", NOT "auto": `auto` defers to the computed `scroll-behavior`,
    // and globals.css sets `html { scroll-behavior: smooth }` — so `auto` would
    // animate, leaving the element still off-screen when we measure and making
    // the step fall back to a centered card. `instant` overrides the CSS.
    // The spotlight's own transition supplies the motion, and it already
    // honours prefers-reduced-motion.
    el.scrollIntoView({ block: "center", inline: "nearest", behavior: "instant" });

    let frame = 0;
    const measure = () => {
      frame = 0;
      const r = el.getBoundingClientRect();
      setGeometry({
        // getBoundingClientRect is already viewport-space and post-transform, so
        // the sidebar's translate-x is handled without any scroll offset math.
        rect: { top: r.top, left: r.left, width: r.width, height: r.height },
        radius: getComputedStyle(el).borderRadius || "12px",
      });
    };
    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(measure);
    };

    measure();

    window.addEventListener("resize", schedule);
    // `capture` because scroll doesn't bubble: the sidebar <nav> is
    // overflow-y-auto and the insights filter bar is sticky inside its own
    // scroller, so listening on window alone would miss both.
    window.addEventListener("scroll", schedule, {
      capture: true,
      passive: true,
    });
    const observer = new ResizeObserver(schedule);
    observer.observe(el);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, { capture: true });
      observer.disconnect();
    };
  }, [anchor]);

  return geometry;
}
