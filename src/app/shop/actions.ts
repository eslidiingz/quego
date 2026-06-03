"use server";

import { redirect } from "next/navigation";
import {
  destroyShopSession,
  getShopSession,
} from "@/lib/auth/shop-session-server";

/**
 * End the current shop session. Branches on `impersonatedBy` so an admin
 * who's been working as a shop returns to /admin/shops (where they can
 * pick another shop), while a real shop owner is sent to the public
 * login screen.
 */
export async function signOutShop() {
  const session = await getShopSession();
  const wasImpersonating = Boolean(session?.impersonatedBy);
  await destroyShopSession();
  redirect(
    wasImpersonating
      ? "/admin/shops?notice=impersonation-ended"
      : "/?notice=signed-out",
  );
}

/**
 * Explicit exit-impersonation action invoked from the impersonation banner.
 * Separated from `signOutShop` so the banner button can't accidentally fire
 * on a non-impersonated session (the banner only mounts when impersonating,
 * but the action also re-checks to be safe).
 */
export async function stopImpersonation() {
  const session = await getShopSession();
  if (!session?.impersonatedBy) {
    redirect("/shop");
  }
  await destroyShopSession();
  redirect("/admin/shops?notice=impersonation-ended");
}
