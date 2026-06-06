"use server";

import { requireAdminSession } from "@/lib/auth/session-server";
import {
  listNewPendingShops,
  type NewPendingShopAlert,
} from "@/lib/services/shops";

export type PollNewPendingShopsResult = {
  serverNowIso: string;
  shops: NewPendingShopAlert[];
};

/**
 * Read-only poll for the admin's live new-registration notifier. The client
 * passes its cursor (`sinceIso`) and gets back any shops that registered since
 * and still await moderation, plus the server's current time so it can advance
 * the cursor against a single clock (no client/server skew).
 *
 * Guarded by `requireAdminSession()` — only an authenticated admin can poll.
 * Deliberately does NOT call revalidatePath: this fires every ~20s and must
 * not churn the cache (the client triggers a refresh itself on fresh hits).
 */
export async function pollNewPendingShops(
  sinceIso: string,
): Promise<PollNewPendingShopsResult> {
  await requireAdminSession();
  // Capture "now" BEFORE the query: a row inserted mid-query (created_at could
  // exceed this) is then caught on the next tick rather than skipped.
  const serverNowIso = new Date().toISOString();
  const shops = await listNewPendingShops(sinceIso);
  return { serverNowIso, shops };
}
