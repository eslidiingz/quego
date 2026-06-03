"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  destroyCustomerSession,
  requireCustomerSession,
} from "@/lib/auth/customer-session-server";
import { cancelOwnBooking } from "@/lib/services/bookings";

export async function signOutCustomer() {
  await destroyCustomerSession();
  redirect("/login?notice=signed-out");
}

export async function cancelMyBooking(bookingId: string): Promise<void> {
  const session = await requireCustomerSession();
  const result = await cancelOwnBooking(bookingId, session.phone);
  if (!result.ok) {
    throw new Error(result.message);
  }
  revalidatePath("/me/bookings");
}
