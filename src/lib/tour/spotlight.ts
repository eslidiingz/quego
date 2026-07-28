import type { TourPlacement } from "./types";

/**
 * Pure positioning math for the guided-tour overlay.
 *
 * Everything here works on plain numbers in **viewport coordinates** — the same
 * space `getBoundingClientRect()` returns and `position: fixed` consumes, so no
 * scroll offset ever enters the math. Keeping it free of the DOM is what makes
 * it testable in the `node` vitest environment (the project has no jsdom).
 */

export type Rect = { top: number; left: number; width: number; height: number };
export type Size = { width: number; height: number };
export type Viewport = Size;

/** Breathing room between the highlighted element and the spotlight ring. */
export const SPOTLIGHT_PADDING = 8;
/** Gap between the spotlight edge and the card. */
export const CARD_GAP = 14;
/** Minimum distance the card keeps from every viewport edge. */
export const VIEWPORT_MARGIN = 12;
/** Fixed card width — measuring it would cost a hidden layout pass per step. */
export const TOUR_CARD_WIDTH = 320;

const PLACEMENTS: readonly TourPlacement[] = ["top", "bottom", "left", "right"];

const OPPOSITE: Record<TourPlacement, TourPlacement> = {
  top: "bottom",
  bottom: "top",
  left: "right",
  right: "left",
};

export function rectRight(rect: Rect): number {
  return rect.left + rect.width;
}

export function rectBottom(rect: Rect): number {
  return rect.top + rect.height;
}

/** Grow a rect by `pad` on every side. Never yields a negative dimension. */
export function inflate(rect: Rect, pad: number): Rect {
  return {
    top: rect.top - pad,
    left: rect.left - pad,
    width: Math.max(0, rect.width + pad * 2),
    height: Math.max(0, rect.height + pad * 2),
  };
}

/**
 * Does the rect actually overlap the visible viewport?
 *
 * This is the mobile-drawer test. `ShopShell`'s sidebar animates with
 * `-translate-x-full`, not `display: none`, so it keeps a real 288px box — just
 * at `left: -288`. `offsetParent === null` does NOT catch that (transforms and
 * `position: fixed` both defeat it), which is why we compare geometry instead.
 */
export function intersectsViewport(rect: Rect, vp: Viewport): boolean {
  if (rect.width <= 0 || rect.height <= 0) return false;
  return (
    rectRight(rect) > 0 &&
    rect.left < vp.width &&
    rectBottom(rect) > 0 &&
    rect.top < vp.height
  );
}

/**
 * Intersect a rect with the viewport. An anchor taller than the screen (a long
 * list, the whole nav column) would otherwise leave the card nowhere to sit.
 */
export function clipToViewport(rect: Rect, vp: Viewport): Rect {
  const left = Math.max(0, rect.left);
  const top = Math.max(0, rect.top);
  const right = Math.min(vp.width, rectRight(rect));
  const bottom = Math.min(vp.height, rectBottom(rect));
  return {
    top,
    left,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
  };
}

/** Free space on each side of the anchor, after reserving the card gap. */
function spaceFor(anchor: Rect, placement: TourPlacement, vp: Viewport): number {
  switch (placement) {
    case "top":
      return anchor.top - CARD_GAP;
    case "bottom":
      return vp.height - rectBottom(anchor) - CARD_GAP;
    case "left":
      return anchor.left - CARD_GAP;
    case "right":
      return vp.width - rectRight(anchor) - CARD_GAP;
  }
}

function fits(
  anchor: Rect,
  card: Size,
  placement: TourPlacement,
  vp: Viewport,
): boolean {
  const needed =
    placement === "top" || placement === "bottom" ? card.height : card.width;
  return spaceFor(anchor, placement, vp) >= needed + VIEWPORT_MARGIN;
}

/**
 * Pick a side for the card: the preferred one if it fits, then its opposite,
 * then whatever else fits, and finally — when nothing fits — the side with the
 * most room, leaving `clampToViewport` to keep the card on screen.
 */
export function choosePlacement(
  anchor: Rect,
  card: Size,
  vp: Viewport,
  preferred: TourPlacement = "bottom",
): TourPlacement {
  const order: TourPlacement[] = [
    preferred,
    OPPOSITE[preferred],
    ...PLACEMENTS.filter((p) => p !== preferred && p !== OPPOSITE[preferred]),
  ];
  for (const placement of order) {
    if (fits(anchor, card, placement, vp)) return placement;
  }
  return order.reduce((best, p) =>
    spaceFor(anchor, p, vp) > spaceFor(anchor, best, vp) ? p : best,
  );
}

/** Ideal card origin for a placement, before clamping. Centered on the anchor. */
export function placeCard(
  anchor: Rect,
  card: Size,
  placement: TourPlacement,
): { left: number; top: number } {
  const centerX = anchor.left + anchor.width / 2 - card.width / 2;
  const centerY = anchor.top + anchor.height / 2 - card.height / 2;
  switch (placement) {
    case "top":
      return { left: centerX, top: anchor.top - CARD_GAP - card.height };
    case "bottom":
      return { left: centerX, top: rectBottom(anchor) + CARD_GAP };
    case "left":
      return { left: anchor.left - CARD_GAP - card.width, top: centerY };
    case "right":
      return { left: rectRight(anchor) + CARD_GAP, top: centerY };
  }
}

/**
 * Keep the card fully on screen. When the card is larger than the viewport in an
 * axis we pin it to the top/left margin rather than producing a negative clamp
 * range — a card taller than the phone still starts at a readable position.
 */
export function clampToViewport(
  pos: { left: number; top: number },
  card: Size,
  vp: Viewport,
  margin: number = VIEWPORT_MARGIN,
): { left: number; top: number } {
  const maxLeft = vp.width - card.width - margin;
  const maxTop = vp.height - card.height - margin;
  return {
    left:
      maxLeft < margin ? margin : Math.min(Math.max(pos.left, margin), maxLeft),
    top: maxTop < margin ? margin : Math.min(Math.max(pos.top, margin), maxTop),
  };
}

function centerCard(card: Size, vp: Viewport): { left: number; top: number } {
  return clampToViewport(
    {
      left: vp.width / 2 - card.width / 2,
      top: vp.height / 2 - card.height / 2,
    },
    card,
    vp,
  );
}

export type TourLayout = {
  mode: "spotlight" | "centered";
  /** Already inflated and clipped; `null` in centered mode. */
  spotlight: Rect | null;
  card: { left: number; top: number };
  placement: TourPlacement | null;
};

/**
 * One shot: everything the overlay needs to render a step.
 *
 * Falls back to a centered card whenever there is nothing sensible to point at
 * — no anchor in the step, the element missing from the page (an empty-state
 * screen), or the element sitting off-canvas (the mobile drawer).
 */
export function computeTourLayout({
  anchor,
  card,
  viewport,
  preferred,
}: {
  anchor: Rect | null;
  card: Size;
  viewport: Viewport;
  preferred?: TourPlacement;
}): TourLayout {
  if (!anchor || !intersectsViewport(anchor, viewport)) {
    return {
      mode: "centered",
      spotlight: null,
      card: centerCard(card, viewport),
      placement: null,
    };
  }

  const spotlight = clipToViewport(inflate(anchor, SPOTLIGHT_PADDING), viewport);
  const placement = choosePlacement(spotlight, card, viewport, preferred);
  return {
    mode: "spotlight",
    spotlight,
    card: clampToViewport(placeCard(spotlight, card, placement), card, viewport),
    placement,
  };
}
