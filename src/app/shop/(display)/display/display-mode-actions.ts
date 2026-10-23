"use server";

import { redirect } from "next/navigation";
import {
  createShopDisplaySession,
  destroyShopDisplaySession,
  destroyShopSession,
  requireShopSession,
} from "@/lib/auth/shop-session-server";

/**
 * Turn THIS device into the waiting-room kiosk (audit M4). Mints the narrow
 * display token from the owner's verified session, then signs the owner out on
 * this device — the tablet must not keep a full owner cookie that anyone tapping
 * it could use to reach customers, expenses or booking management.
 */
export async function startDisplayModeAction(): Promise<void> {
  const session = await requireShopSession();
  await createShopDisplaySession({
    shopId: session.shopId,
    shopName: session.shopName,
  });
  await destroyShopSession();
  redirect("/shop/display");
}

/**
 * Leave kiosk mode. Drops the display token and sends the device to the shop
 * login — getting back into the owner area takes the phone + PIN again.
 */
export async function exitDisplayModeAction(): Promise<void> {
  await destroyShopDisplaySession();
  redirect("/login?tab=shop");
}
