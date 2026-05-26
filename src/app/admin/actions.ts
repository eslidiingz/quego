"use server";

import { redirect } from "next/navigation";
import { destroyAdminSession } from "@/lib/auth/session-server";

export async function signOutAdmin() {
  await destroyAdminSession();
  // Flash via search param: survives the redirect, FlashToast on login picks it up.
  redirect("/admin/login?notice=signed-out");
}
