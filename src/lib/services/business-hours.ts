import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  DAYS_OF_WEEK,
  type BusinessHour,
  type DayOfWeek,
} from "@/lib/booking/slot-math";

// Re-export so existing callers (`@/lib/services/business-hours`) keep
// resolving — the canonical definition now lives in the pure module.
export { DAYS_OF_WEEK };
export type { BusinessHour, DayOfWeek };

export type UpsertBusinessHoursResult =
  | { ok: true }
  | { ok: false; code: "validation" | "unknown"; message: string };

const DEFAULT_HOUR = (day: DayOfWeek): BusinessHour => ({
  dayOfWeek: day,
  isOpen: false,
  openTime: null,
  closeTime: null,
});

// ----- Read ---------------------------------------------------------------

/**
 * Returns a 7-element array of business hours for the shop, with closed
 * defaults for any day that has no row in the database. The caller always
 * gets exactly one entry per day — no need to back-fill on the client.
 *
 * SRP: read shape only — does not own the upsert path.
 */
export async function listBusinessHours(
  shopId: string,
): Promise<BusinessHour[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("shop_business_hours")
    .select("day_of_week, is_open, open_time, close_time")
    .eq("shop_id", shopId)
    .order("day_of_week", { ascending: true });

  if (error || !data) {
    return DAYS_OF_WEEK.map(DEFAULT_HOUR);
  }

  const byDay = new Map<DayOfWeek, BusinessHour>();
  for (const row of data) {
    const day = row.day_of_week as DayOfWeek;
    byDay.set(day, {
      dayOfWeek: day,
      isOpen: row.is_open,
      openTime: row.open_time ? row.open_time.slice(0, 5) : null,
      closeTime: row.close_time ? row.close_time.slice(0, 5) : null,
    });
  }

  return DAYS_OF_WEEK.map((d) => byDay.get(d) ?? DEFAULT_HOUR(d));
}

// ----- Write --------------------------------------------------------------

// HH:MM with minute aligned to 10-minute increments. Keep this in sync
// with the action-layer regex; both enforce the same granularity.
const TIME_RE = /^([01]\d|2[0-3]):[0-5]0$/u;

export function validate(hours: BusinessHour[]): string | null {
  if (hours.length !== 7) return "ต้องระบุข้อมูลครบทั้ง 7 วัน";
  const seen = new Set<number>();
  for (const h of hours) {
    if (seen.has(h.dayOfWeek)) return "ข้อมูลวันซ้ำกัน";
    seen.add(h.dayOfWeek);
    if (h.isOpen) {
      if (!h.openTime || !TIME_RE.test(h.openTime)) {
        return `เวลาเปิดของวันที่ ${h.dayOfWeek} ไม่ถูกต้อง`;
      }
      if (!h.closeTime || !TIME_RE.test(h.closeTime)) {
        return `เวลาปิดของวันที่ ${h.dayOfWeek} ไม่ถูกต้อง`;
      }
      if (h.openTime >= h.closeTime) {
        return `เวลาเปิดต้องน้อยกว่าเวลาปิด`;
      }
    }
  }
  return null;
}

/**
 * Replace the shop's complete weekly schedule. The caller passes all 7 days
 * (use `DAYS_OF_WEEK` to iterate) and we issue a bulk upsert keyed on
 * (shop_id, day_of_week).
 *
 * SRP: write + DB-level validation only. Phone/session auth lives in the
 * server action layer.
 */
export async function upsertBusinessHours(
  shopId: string,
  hours: BusinessHour[],
): Promise<UpsertBusinessHoursResult> {
  const validationError = validate(hours);
  if (validationError) {
    return { ok: false, code: "validation", message: validationError };
  }

  const rows = hours.map((h) => ({
    shop_id: shopId,
    day_of_week: h.dayOfWeek,
    is_open: h.isOpen,
    open_time: h.isOpen ? h.openTime : null,
    close_time: h.isOpen ? h.closeTime : null,
  }));

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("shop_business_hours")
    .upsert(rows, { onConflict: "shop_id,day_of_week" });

  if (error) {
    return { ok: false, code: "unknown", message: error.message };
  }
  return { ok: true };
}
