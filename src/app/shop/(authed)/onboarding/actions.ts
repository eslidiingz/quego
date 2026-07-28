"use server";

import { revalidatePath } from "next/cache";
import { requireShopSession } from "@/lib/auth/shop-session-server";
import { markShopTourSeen } from "@/lib/services/shops";

/**
 * Server actions for shop onboarding state (the guided tour).
 *
 * This folder has no `page.tsx`, so it adds no route — same convention as
 * `(authed)/notifications/actions.ts`. Thin adapters only: the session gives us
 * the shop id (never trust a client-supplied one), the service does the write.
 */

export type OnboardingActionState =
  | { ok: true }
  | { ok: false; code: "impersonating" | "unknown"; message: string };

/**
 * Stamp "this owner has seen the guided tour", so it stops auto-running.
 *
 * Refuses under impersonation: an admin looking at a shop must not burn the
 * real owner's one first-run experience.
 */
export async function markShopTourSeenAction(): Promise<OnboardingActionState> {
  const session = await requireShopSession();

  if (session.impersonatedBy) {
    return {
      ok: false,
      code: "impersonating",
      message: "อยู่ในโหมดผู้ดูแล จึงไม่บันทึกสถานะการดูคำแนะนำ",
    };
  }

  const result = await markShopTourSeen(session.shopId);
  if (result.ok) revalidatePath("/shop", "layout");
  return result;
}
