import { describe, it, expect } from "vitest";

import {
  CARD_GAP,
  SPOTLIGHT_PADDING,
  VIEWPORT_MARGIN,
  choosePlacement,
  clampToViewport,
  clipToViewport,
  computeTourLayout,
  inflate,
  intersectsViewport,
  placeCard,
  type Rect,
  type Size,
  type Viewport,
} from "./spotlight";

const DESKTOP: Viewport = { width: 1440, height: 900 };
const PHONE: Viewport = { width: 320, height: 568 };
const CARD: Size = { width: 320, height: 180 };

describe("inflate", () => {
  it("grows the rect on every side", () => {
    expect(inflate({ top: 100, left: 200, width: 50, height: 40 }, 8)).toEqual({
      top: 92,
      left: 192,
      width: 66,
      height: 56,
    });
  });

  it("never produces a negative dimension", () => {
    const r = inflate({ top: 0, left: 0, width: 4, height: 4 }, -10);
    expect(r.width).toBe(0);
    expect(r.height).toBe(0);
  });
});

describe("intersectsViewport", () => {
  it("accepts a rect fully on screen", () => {
    expect(
      intersectsViewport({ top: 10, left: 10, width: 100, height: 40 }, DESKTOP),
    ).toBe(true);
  });

  it("rejects the mobile nav drawer parked off-canvas", () => {
    // ShopShell slides the 288px sidebar out with -translate-x-full, so it keeps
    // a real box at left: -288 rather than disappearing from layout.
    expect(
      intersectsViewport({ top: 64, left: -288, width: 288, height: 700 }, PHONE),
    ).toBe(false);
  });

  it("accepts a drawer that is only partly on screen", () => {
    expect(
      intersectsViewport({ top: 64, left: -280, width: 288, height: 700 }, PHONE),
    ).toBe(true);
  });

  it("rejects a zero-sized rect (display:none)", () => {
    expect(
      intersectsViewport({ top: 0, left: 0, width: 0, height: 0 }, DESKTOP),
    ).toBe(false);
  });

  it("rejects a rect scrolled entirely above the viewport", () => {
    expect(
      intersectsViewport(
        { top: -200, left: 10, width: 100, height: 100 },
        DESKTOP,
      ),
    ).toBe(false);
  });
});

describe("clipToViewport", () => {
  it("leaves a fully visible rect alone", () => {
    const r: Rect = { top: 10, left: 10, width: 100, height: 40 };
    expect(clipToViewport(r, DESKTOP)).toEqual(r);
  });

  it("clips an anchor taller than the viewport to the visible slice", () => {
    expect(
      clipToViewport({ top: -100, left: 0, width: 200, height: 1200 }, PHONE),
    ).toEqual({ top: 0, left: 0, width: 200, height: 568 });
  });

  it("collapses a rect that is entirely off screen", () => {
    const r = clipToViewport(
      { top: 0, left: -400, width: 100, height: 100 },
      PHONE,
    );
    expect(r.width).toBe(0);
  });
});

describe("choosePlacement", () => {
  const anchor: Rect = { top: 400, left: 600, width: 200, height: 60 };

  it("keeps the preferred side when it fits", () => {
    expect(choosePlacement(anchor, CARD, DESKTOP, "bottom")).toBe("bottom");
  });

  it("flips bottom to top when there is no room below", () => {
    const nearBottom: Rect = { top: 820, left: 600, width: 200, height: 60 };
    expect(choosePlacement(nearBottom, CARD, DESKTOP, "bottom")).toBe("top");
  });

  it("flips right to left for an anchor pinned to the right edge", () => {
    const nearRight: Rect = { top: 400, left: 1300, width: 120, height: 60 };
    expect(choosePlacement(nearRight, CARD, DESKTOP, "right")).toBe("left");
  });

  it("falls back to a perpendicular side when neither the preferred nor its opposite fits", () => {
    // Tall anchor: no room above or below, plenty to the right.
    const tall: Rect = { top: 20, left: 40, width: 120, height: 860 };
    expect(choosePlacement(tall, CARD, DESKTOP, "bottom")).toBe("right");
  });

  it("still returns a placement when nothing fits", () => {
    // On a 320px-wide phone a 320px card never fits beside anything.
    const anywhere: Rect = { top: 250, left: 60, width: 200, height: 60 };
    expect(["top", "bottom", "left", "right"]).toContain(
      choosePlacement(anywhere, CARD, PHONE, "right"),
    );
  });
});

describe("placeCard", () => {
  const anchor: Rect = { top: 400, left: 600, width: 200, height: 60 };

  it("sits below the anchor with the configured gap, horizontally centered", () => {
    expect(placeCard(anchor, CARD, "bottom")).toEqual({
      left: 600 + 100 - 160,
      top: 460 + CARD_GAP,
    });
  });

  it("sits above the anchor by gap + card height", () => {
    expect(placeCard(anchor, CARD, "top").top).toBe(400 - CARD_GAP - 180);
  });

  it("sits to the left by gap + card width", () => {
    expect(placeCard(anchor, CARD, "left").left).toBe(600 - CARD_GAP - 320);
  });
});

describe("clampToViewport", () => {
  it("pulls a card back inside the left edge", () => {
    expect(clampToViewport({ left: -80, top: 100 }, CARD, DESKTOP).left).toBe(
      VIEWPORT_MARGIN,
    );
  });

  it("pulls a card back inside the bottom edge", () => {
    expect(clampToViewport({ left: 100, top: 880 }, CARD, DESKTOP).top).toBe(
      900 - 180 - VIEWPORT_MARGIN,
    );
  });

  it("never lets the card leave a 320x568 phone viewport", () => {
    for (const pos of [
      { left: -500, top: -500 },
      { left: 5000, top: 5000 },
      { left: 0, top: 300 },
    ]) {
      const out = clampToViewport(pos, { width: 296, height: 200 }, PHONE);
      expect(out.left).toBeGreaterThanOrEqual(VIEWPORT_MARGIN);
      expect(out.top).toBeGreaterThanOrEqual(VIEWPORT_MARGIN);
      expect(out.left + 296).toBeLessThanOrEqual(PHONE.width - VIEWPORT_MARGIN);
      expect(out.top + 200).toBeLessThanOrEqual(PHONE.height - VIEWPORT_MARGIN);
    }
  });

  it("pins to the margin instead of inverting when the card is wider than the viewport", () => {
    // 320px card in a 320px viewport: the horizontal clamp range is negative.
    // The vertical axis still fits, so it clamps normally to the bottom edge.
    const out = clampToViewport({ left: 999, top: 999 }, CARD, PHONE);
    expect(out.left).toBe(VIEWPORT_MARGIN);
    expect(out.top).toBe(PHONE.height - CARD.height - VIEWPORT_MARGIN);
  });

  it("pins to the top margin when the card is taller than the viewport", () => {
    const out = clampToViewport(
      { left: 0, top: 999 },
      { width: 280, height: 700 },
      PHONE,
    );
    expect(out.top).toBe(VIEWPORT_MARGIN);
  });
});

describe("computeTourLayout", () => {
  it("centers the card when the step has no anchor", () => {
    const layout = computeTourLayout({
      anchor: null,
      card: CARD,
      viewport: DESKTOP,
    });
    expect(layout.mode).toBe("centered");
    expect(layout.spotlight).toBeNull();
    expect(layout.placement).toBeNull();
    expect(layout.card.left).toBe(DESKTOP.width / 2 - CARD.width / 2);
  });

  it("centers the card when the anchor is the off-canvas mobile drawer", () => {
    const layout = computeTourLayout({
      anchor: { top: 64, left: -288, width: 288, height: 700 },
      card: CARD,
      viewport: PHONE,
    });
    expect(layout.mode).toBe("centered");
    expect(layout.spotlight).toBeNull();
  });

  it("centers the card when the anchor has collapsed to zero size", () => {
    const layout = computeTourLayout({
      anchor: { top: 0, left: 0, width: 0, height: 0 },
      card: CARD,
      viewport: DESKTOP,
    });
    expect(layout.mode).toBe("centered");
  });

  it("pads the spotlight around a visible anchor", () => {
    const layout = computeTourLayout({
      anchor: { top: 300, left: 500, width: 200, height: 60 },
      card: CARD,
      viewport: DESKTOP,
      preferred: "bottom",
    });
    expect(layout.mode).toBe("spotlight");
    expect(layout.spotlight).toEqual({
      top: 300 - SPOTLIGHT_PADDING,
      left: 500 - SPOTLIGHT_PADDING,
      width: 200 + SPOTLIGHT_PADDING * 2,
      height: 60 + SPOTLIGHT_PADDING * 2,
    });
    expect(layout.placement).toBe("bottom");
  });

  it("keeps the card on screen for an anchor jammed into the corner", () => {
    const layout = computeTourLayout({
      anchor: { top: 860, left: 1400, width: 32, height: 32 },
      card: CARD,
      viewport: DESKTOP,
    });
    expect(layout.card.left).toBeGreaterThanOrEqual(VIEWPORT_MARGIN);
    expect(layout.card.left + CARD.width).toBeLessThanOrEqual(
      DESKTOP.width - VIEWPORT_MARGIN,
    );
    expect(layout.card.top + CARD.height).toBeLessThanOrEqual(
      DESKTOP.height - VIEWPORT_MARGIN,
    );
  });

  it("clips the spotlight for an anchor taller than the viewport", () => {
    const layout = computeTourLayout({
      anchor: { top: -200, left: 40, width: 240, height: 1400 },
      card: CARD,
      viewport: PHONE,
    });
    expect(layout.spotlight?.top).toBe(0);
    expect(layout.spotlight?.height).toBe(PHONE.height);
  });
});
