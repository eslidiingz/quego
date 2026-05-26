/**
 * Pure (browser-safe) booking-domain types and slot math.
 *
 * Lives in `lib/booking/` rather than `lib/services/` so it doesn't carry
 * the `server-only` marker — both the server (`bookings.ts`) and the
 * customer-facing client form import from here.
 */

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const DAYS_OF_WEEK: DayOfWeek[] = [0, 1, 2, 3, 4, 5, 6];

export type BusinessHour = {
  dayOfWeek: DayOfWeek;
  isOpen: boolean;
  /** HH:MM (24h). Null when the day is closed. */
  openTime: string | null;
  closeTime: string | null;
};

export type TakenSlot = { date: string; slotTime: string };

/**
 * Everything the client booking form needs to render the booking window
 * without round-tripping back to the server on every date change.
 */
export type BookingContext = {
  shop: {
    id: string;
    name: string;
    serviceDurationMinutes: number;
  };
  /** Indexed positionally so callers can do `hours[dayOfWeek]`. */
  hours: BusinessHour[];
  takenSlots: TakenSlot[];
  /** Inclusive boundaries of the booking window, Bangkok calendar dates. */
  windowStart: string;
  windowEnd: string;
  /** Today's Bangkok date — used by the client to mark today's past slots. */
  nowDate: string;
  nowTimeHHMM: string;
};

/**
 * Generate the full list of slot start times for a single open day.
 * A slot must FIT inside the open window (start + duration <= close).
 *
 * Shared between the server-side validator and the client picker so the
 * two sides can't disagree about which times exist.
 */
export function generateSlots(
  openTime: string,
  closeTime: string,
  durationMinutes: number,
): string[] {
  const open = hhmmToMinutes(openTime);
  const close = hhmmToMinutes(closeTime);
  if (open >= close || durationMinutes <= 0) return [];
  const out: string[] = [];
  for (let t = open; t + durationMinutes <= close; t += durationMinutes) {
    out.push(minutesToHHMM(t));
  }
  return out;
}

function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function minutesToHHMM(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
