"use client";

import { SHOP_TOURS } from "@/lib/tour/shop-tours";
import { TourProvider } from "./TourProvider";

/**
 * Binds the generic tour engine to the shop registry.
 *
 * This exists as its own `"use client"` module so `SHOP_TOURS` is imported on
 * the *client* side of the boundary: the Thai copy then ships once in a
 * code-split, browser-cached chunk instead of being serialised into the RSC
 * payload of every shop page render.
 */
export function ShopTourProvider({ children }: { children: React.ReactNode }) {
  return <TourProvider tours={SHOP_TOURS}>{children}</TourProvider>;
}
