"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  destroyCustomerSession,
  getCustomerSession,
  requireCustomerSession,
} from "@/lib/auth/customer-session-server";
import { cancelOwnBooking } from "@/lib/services/bookings";
import { createReview } from "@/lib/services/reviews";
import {
  cancelWaitlistEntry,
  countOpenWaitlistSlots,
} from "@/lib/services/waitlist";

export async function signOutCustomer() {
  await destroyCustomerSession();
  redirect("/?notice=signed-out");
}

export async function cancelMyBooking(bookingId: string): Promise<void> {
  const session = await requireCustomerSession();
  const result = await cancelOwnBooking(bookingId, session.phone);
  if (!result.ok) {
    throw new Error(result.message);
  }
  revalidatePath("/me/bookings");
}

export async function createMyReview(
  bookingId: string,
  rating: number,
  comment: string,
): Promise<void> {
  const session = await requireCustomerSession();
  const result = await createReview(bookingId, session.phone, rating, comment);
  if (!result.ok) {
    throw new Error(result.message);
  }
  revalidatePath("/me/bookings");
}

export async function cancelMyWaitlistEntry(entryId: string): Promise<void> {
  const session = await requireCustomerSession();
  const result = await cancelWaitlistEntry(entryId, session.phone);
  if (!result.ok) {
    throw new Error(result.message);
  }
  revalidatePath("/me/waitlist");
}

/**
 * Poll target for the live รอคิว nav badge ({@link WaitlistNavBadge}). Returns
 * how many of the signed-in customer's waitlist entries now have an open slot
 * (`notified`). Uses `getCustomerSession` (not `require*`) so it never redirects
 * — the badge poller may tick on a public page or just after sign-out; in that
 * case there's no session and the count is simply 0.
 */
export async function pollMyOpenWaitlistCount(): Promise<number> {
  const session = await getCustomerSession();
  if (!session) return 0;
  return countOpenWaitlistSlots(session.phone);
}
