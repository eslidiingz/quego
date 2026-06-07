"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  destroyCustomerSession,
  requireCustomerSession,
} from "@/lib/auth/customer-session-server";
import { cancelOwnBooking } from "@/lib/services/bookings";
import { createReview, updateReview } from "@/lib/services/reviews";

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

export async function updateMyReview(
  reviewId: string,
  rating: number,
  comment: string,
): Promise<void> {
  const session = await requireCustomerSession();
  const result = await updateReview(reviewId, session.phone, rating, comment);
  if (!result.ok) {
    throw new Error(result.message);
  }
  revalidatePath("/me/bookings");
}
