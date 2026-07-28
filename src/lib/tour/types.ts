import type { TourAnchorId } from "./anchors";

export type TourPlacement = "top" | "bottom" | "left" | "right";

/**
 * One coachmark in a guided tour.
 *
 * PURE DATA ONLY — no functions, no JSX. Two reasons: the whole registry stays
 * unit-testable in the `node` vitest env, and a step could cross the RSC
 * boundary unchanged if a server component ever needs to hand one down.
 */
export type TourStep = {
  /**
   * Element carrying `data-tour="<id>"`. When omitted — or when the element is
   * missing / zero-sized / scrolled entirely off-canvas (the mobile nav drawer
   * sits at `x: -288`) — the card renders centered with no spotlight.
   */
  anchor?: TourAnchorId;
  title: string;
  body: string;
  /** Preferred side of the anchor; the engine flips and clamps when it doesn't fit. */
  placement?: TourPlacement;
  /**
   * Shown INSTEAD of `body` when the card falls back to centered mode. Required
   * on every anchored step (enforced by `shop-tours.test.ts`) because the anchor
   * disappearing is the *normal* case on an empty page or a narrow viewport, and
   * "look at the thing highlighted here" reads as broken with nothing highlighted.
   */
  fallbackBody?: string;
  /** Optional call-to-action on the final step: ends the tour, then navigates. */
  cta?: { label: string; href: string };
};

export type Tour = {
  id: string;
  title: string;
  steps: TourStep[];
};

export type TourEndReason = "completed" | "skipped";
