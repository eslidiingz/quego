"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createWalkInBooking } from "@/lib/services/bookings";
import { isValidThaiPhone } from "@/lib/validation/phone";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit";

export type WalkInState = {
  ok: false;
  code: string;
  message: string;
} | null;

/**
 * Server action behind the in-shop QR walk-in form (OPP-08). The customer
 * scans the QR, enters name + phone and picks a service; this places them in
 * the soonest opening today via `createWalkInBooking` and redirects to the
 * standard live-queue page. Stays a pure (state, formData) -> state shape for
 * React 19's `useActionState` once `shopId` is bound.
 *
 * `shopId` is BOUND on the server (`joinWalkInAction.bind(null, shopId)` in the
 * page) rather than read from the form, so it can't be forged to evade the
 * per-(shop,ip) rate-limit bucket or point the booking elsewhere.
 *
 * Phone is REQUIRED here (unlike the shop's manual NewBookingDialog): a kiosk
 * walk-in has no staff to help them recover the booking, so the phone is their
 * one channel for the LINE confirmation and any later lookup.
 */
export async function joinWalkInAction(
  shopId: string,
  _prev: WalkInState,
  formData: FormData,
): Promise<WalkInState> {
  const serviceId = String(formData.get("serviceId") ?? "");
  const customerName = String(formData.get("customerName") ?? "").trim();
  const customerPhone = String(formData.get("customerPhone") ?? "").trim();

  // Rate limit per shop + client IP: an in-store kiosk shares one IP, so key on
  // the shop too — one busy shop's device can't starve another behind the same
  // NAT. Looser cap than the booking form (20/10min) for the same reason.
  const ip = await getClientIp();
  if (!(await checkRateLimit(`walk-in:${shopId}:${ip}`, 20, 600))) {
    return {
      ok: false,
      code: "rate_limited",
      message: "คำขอถี่เกินไป กรุณาลองใหม่อีกครั้งในภายหลัง",
    };
  }

  // Surface field problems as inline errors (the service would reject these too,
  // but a precise message beats the generic "ข้อมูลไม่ถูกต้อง").
  if (!serviceId) {
    return { ok: false, code: "service_required", message: "กรุณาเลือกบริการ" };
  }
  if (customerName.length === 0) {
    return { ok: false, code: "name_required", message: "กรุณากรอกชื่อ" };
  }
  if (!isValidThaiPhone(customerPhone)) {
    return {
      ok: false,
      code: "phone_invalid",
      message: "กรุณากรอกเบอร์โทร 10 หลัก",
    };
  }

  const result = await createWalkInBooking({
    shopId,
    serviceId,
    customerName,
    customerPhone,
  });

  if (!result.ok) {
    return { ok: false, code: result.code, message: result.message };
  }

  revalidatePath(`/shops/${shopId}/walk-in`);
  redirect(`/bookings/${result.bookingId}`);
}
