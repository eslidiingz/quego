/**
 * Per-phone booking caps (audit H1) and the per-shop manual-booking cap (M6).
 *
 * Anonymous booking stays OTP-free, so the phone number is an unproven claim.
 * These caps bound how much one number can occupy or trigger: they never stop
 * a normal customer (or one booking for a family member), but a single phone
 * can't fill a shop's calendar or be used to spam a victim with LINE pushes.
 *
 * Pure data + pure evaluation so it runs in the `node` test env; the service
 * layer does the counting (see `checkPhoneBookingCaps` in services/bookings).
 * Every number lives here — tune them in one place.
 */

export const PHONE_CAPS = {
  /** Confirmed bookings at ONE shop on ONE date (self + one other person). */
  perShopPerDay: 2,
  /** Upcoming confirmed bookings at ONE shop. */
  perShopUpcoming: 3,
  /** Upcoming confirmed bookings across ALL shops. */
  allShopsUpcoming: 5,
  /** Bookings created in the last 24h, cancelled ones included (churn guard). */
  createdPer24h: 6,
  /** Active (confirmed, today) walk-ins at ONE shop. */
  walkInActivePerShop: 1,
  /** Active (waiting / notified) waitlist entries across ALL shops. */
  waitlistActiveAllShops: 3,
} as const;

/** Shop-made bookings per shop per rolling hour. Exempt from the phone caps. */
export const SHOP_MANUAL_BOOKINGS_PER_HOUR = 30;

/** Booking origin, mirrors bookings.created_by. */
export type BookingOrigin = "customer" | "walk_in" | "shop";

/** One of this phone's customer-originated bookings, as the counter sees it. */
export type PhoneBookingRow = {
  shopId: string;
  bookingDate: string; // YYYY-MM-DD
  status: "confirmed" | "cancelled" | "completed";
  createdBy: "customer" | "walk_in";
  createdAt: string; // ISO timestamp
};

export type PhoneCapInput = {
  /** Rows for this phone: upcoming (date >= today) OR created in the last 24h. */
  rows: PhoneBookingRow[];
  origin: "customer" | "walk_in";
  shopId: string;
  date: string; // date being booked
  today: string; // Bangkok YYYY-MM-DD
  nowMs: number;
};

export type PhoneCapViolation =
  | "per_shop_per_day"
  | "per_shop_upcoming"
  | "all_shops_upcoming"
  | "created_per_24h"
  | "walk_in_active";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Returns the first cap the new booking would exceed, or null when allowed.
 * "Upcoming" = confirmed with booking_date >= today.
 */
export function evaluatePhoneCaps(input: PhoneCapInput): PhoneCapViolation | null {
  const { rows, origin, shopId, date, today, nowMs } = input;
  const upcoming = rows.filter(
    (r) => r.status === "confirmed" && r.bookingDate >= today,
  );
  const atShop = upcoming.filter((r) => r.shopId === shopId);

  if (origin === "walk_in") {
    const activeWalkIns = atShop.filter(
      (r) => r.createdBy === "walk_in" && r.bookingDate === today,
    ).length;
    if (activeWalkIns >= PHONE_CAPS.walkInActivePerShop) return "walk_in_active";
  }

  const recent = rows.filter((r) => nowMs - Date.parse(r.createdAt) < DAY_MS);
  if (recent.length >= PHONE_CAPS.createdPer24h) return "created_per_24h";

  if (atShop.filter((r) => r.bookingDate === date).length >= PHONE_CAPS.perShopPerDay) {
    return "per_shop_per_day";
  }
  if (atShop.length >= PHONE_CAPS.perShopUpcoming) return "per_shop_upcoming";
  if (upcoming.length >= PHONE_CAPS.allShopsUpcoming) return "all_shops_upcoming";
  return null;
}

/** Thai copy per violation. The shop phone is on the page, so point there. */
export const PHONE_CAP_MESSAGES: Record<PhoneCapViolation, string> = {
  per_shop_per_day:
    "เบอร์นี้จองร้านนี้ในวันเดียวกันครบแล้ว หากต้องการเพิ่ม กรุณาโทรติดต่อร้าน",
  per_shop_upcoming:
    "เบอร์นี้มีคิวที่ร้านนี้ครบแล้ว ดูหรือยกเลิกคิวเดิมได้ที่หน้าคิวของฉัน หรือโทรติดต่อร้าน",
  all_shops_upcoming:
    "เบอร์นี้มีคิวที่ยังไม่ถึงเวลาครบแล้ว ดูหรือยกเลิกคิวเดิมได้ที่หน้าคิวของฉัน",
  created_per_24h:
    "เบอร์นี้จองบ่อยเกินไปใน 24 ชั่วโมง กรุณาลองใหม่ภายหลัง หรือโทรติดต่อร้าน",
  walk_in_active: "เบอร์นี้มีคิว walk-in ที่ร้านนี้อยู่แล้ว กรุณารอเรียกคิวเดิม",
};

export const WAITLIST_CAP_MESSAGE =
  "เบอร์นี้อยู่ในรายชื่อรอคิวครบแล้ว กรุณารอคิวเดิม หรือยกเลิกที่หน้าคิวของฉัน";

export const SHOP_MANUAL_CAP_MESSAGE =
  "ร้านสร้างคิวเองถี่เกินไป กรุณารอสักครู่แล้วลองใหม่";
