import { describe, it, expect } from "vitest";

import { ALL_TOUR_ANCHORS } from "./anchors";
import {
  SHOP_TOURS,
  getShopTour,
  profileTourId,
  type ShopTourId,
} from "./shop-tours";
import type { Tour } from "./types";

// Widened to `Tour` on purpose: `SHOP_TOURS` uses `satisfies`, which keeps each
// step's exact literal type, so optional fields like `cta` aren't visible on the
// steps that omit them. These tests assert against the declared contract.
const tours: Tour[] = Object.values(SHOP_TOURS);
const entries = Object.entries(SHOP_TOURS) as [ShopTourId, Tour][];

describe("SHOP_TOURS structure", () => {
  it("keys every tour by its own id", () => {
    for (const [key, tour] of entries) {
      expect(tour.id).toBe(key);
    }
  });

  it("covers all ten shop menus", () => {
    // One tour per page the sidebar links to, plus the auto-run welcome tour and
    // the three /shop/profile tabs (which swap the whole page body).
    expect(Object.keys(SHOP_TOURS).sort()).toEqual(
      [
        "shop-bookings",
        "shop-customer-detail",
        "shop-customers",
        "shop-display",
        "shop-expenses",
        "shop-home",
        "shop-insights",
        "shop-profile-hours",
        "shop-profile-info",
        "shop-profile-security",
        "shop-services",
        "shop-share",
        "shop-staff",
        "shop-welcome",
      ].sort(),
    );
  });

  it("gives every tour between 2 and 8 steps", () => {
    for (const tour of tours) {
      expect(tour.steps.length).toBeGreaterThanOrEqual(2);
      expect(tour.steps.length).toBeLessThanOrEqual(8);
    }
  });

  it("gives every tour a non-empty title", () => {
    for (const tour of tours) {
      expect(tour.title.trim().length).toBeGreaterThan(0);
    }
  });
});

describe("SHOP_TOURS steps", () => {
  it("only references anchors that exist in TOUR_ANCHORS", () => {
    for (const tour of tours) {
      for (const step of tour.steps) {
        if (step.anchor) expect(ALL_TOUR_ANCHORS).toContain(step.anchor);
      }
    }
  });

  it("gives every step non-empty title and body copy", () => {
    for (const tour of tours) {
      for (const step of tour.steps) {
        expect(step.title.trim().length).toBeGreaterThan(0);
        expect(step.body.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("gives every anchored step a fallbackBody", () => {
    // The anchor disappearing is normal, not exceptional: empty-state pages drop
    // their list rows and the nav is an off-canvas drawer below `lg`. Without a
    // fallback the card would say "look at this" with nothing highlighted.
    for (const tour of tours) {
      for (const step of tour.steps) {
        if (!step.anchor) continue;
        expect(
          step.fallbackBody?.trim().length,
          `${tour.id} → "${step.title}" is anchored but has no fallbackBody`,
        ).toBeGreaterThan(0);
      }
    }
  });

  it("never anchors the same element twice within one tour", () => {
    for (const tour of tours) {
      const anchors = tour.steps
        .map((s) => s.anchor)
        .filter((a): a is NonNullable<typeof a> => Boolean(a));
      expect(new Set(anchors).size, `${tour.id} repeats an anchor`).toBe(
        anchors.length,
      );
    }
  });

  it("only puts a CTA on the last step of a tour", () => {
    for (const tour of tours) {
      tour.steps.forEach((step, i) => {
        if (!step.cta) return;
        expect(i, `${tour.id} has a CTA on a non-final step`).toBe(
          tour.steps.length - 1,
        );
        expect(step.cta.href.startsWith("/")).toBe(true);
        expect(step.cta.label.trim().length).toBeGreaterThan(0);
      });
    }
  });
});

describe("tour lookups", () => {
  it("returns the tour for a known id", () => {
    expect(getShopTour("shop-home").id).toBe("shop-home");
  });

  it("maps every profile tab to its own tour", () => {
    expect(profileTourId("info")).toBe("shop-profile-info");
    expect(profileTourId("hours")).toBe("shop-profile-hours");
    expect(profileTourId("security")).toBe("shop-profile-security");
  });
});

describe("shared steps", () => {
  it("reuses one nav step object across the welcome and home tours", () => {
    // Identity, not deep equality: the point is that editing the copy once
    // updates both tours, so they can never drift apart.
    expect(SHOP_TOURS["shop-welcome"].steps[1]).toBe(
      SHOP_TOURS["shop-home"].steps[0],
    );
  });

  it("reuses one profile-tabs step across all three profile tours", () => {
    const info = SHOP_TOURS["shop-profile-info"].steps[0];
    expect(SHOP_TOURS["shop-profile-hours"].steps[0]).toBe(info);
    expect(SHOP_TOURS["shop-profile-security"].steps[0]).toBe(info);
  });
});
