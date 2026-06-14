import type { BookingStatus, CancelledBy } from "@/lib/services/bookings";

/**
 * Shared presentation constants + helpers for the shop-side booking cards —
 * `BookingRow` (/shop/bookings) and `TodayBookingRow` (the dashboard). Kept in
 * one place so both surfaces read state, label it, and style their action
 * buttons identically; there is no second visual language to drift out of sync.
 *
 * Pure constants + functions only (no `server-only`/`use client` directive), so
 * a server component and a client island can both import from here.
 */

export const STATUS_META: Record<
  BookingStatus,
  { label: string; variant: "confirmed" | "success" | "danger" }
> = {
  confirmed: { label: "รอรับบริการ", variant: "confirmed" },
  completed: { label: "เสร็จสิ้น", variant: "success" },
  cancelled: { label: "ยกเลิก", variant: "danger" },
};

/**
 * Left-border accent colour per status, so a row's state is legible from a fast
 * vertical scan even before the chip is read. Cancelled uses a faded error tone
 * (the row itself is already dimmed).
 */
export const STATUS_ACCENT: Record<BookingStatus, string> = {
  confirmed: "border-l-primary",
  completed: "border-l-success",
  cancelled: "border-l-error/40",
};

/**
 * Cancelled-status chip label, specialised by who cancelled. Legacy rows with
 * an unknown source (cancelled_by = null) fall back to the plain "ยกเลิก".
 */
export function cancelChipLabel(by: CancelledBy | null): string {
  if (by === "customer") return "ลูกค้ายกเลิก";
  if (by === "shop") return "ร้านยกเลิก";
  return "ยกเลิก";
}

// ----- Action button styles (complete / cancel) --------------------------
// Fixed `h-10` height guarantees the paired buttons are always the same size
// (project rule: paired buttons must be equal width/height, single-line, with
// consistent icons). Shared by the two ConfirmDialog triggers on the bookings
// list and the dashboard's TodayBookingRow.

export const ACTION_BASE =
  "inline-flex h-10 items-center justify-center gap-1.5 rounded-full px-3 text-label-md font-semibold transition-all active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";

export const COMPLETE_STYLE =
  "bg-success text-on-success hover:opacity-90 focus-visible:ring-success";

export const CANCEL_STYLE =
  "border-2 border-outline-variant text-on-surface-variant hover:border-error hover:bg-error/5 hover:text-error focus-visible:ring-error";

// ----- Thai date formatting ----------------------------------------------

const THAI_DAY_LONG = [
  "อาทิตย์",
  "จันทร์",
  "อังคาร",
  "พุธ",
  "พฤหัสบดี",
  "ศุกร์",
  "เสาร์",
];

const THAI_MONTH_SHORT = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
];

/** "วันอาทิตย์ที่ 14 มิ.ย. 2569" — full Thai date with Buddhist-era year. */
export function formatThaiDateFull(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `วัน${THAI_DAY_LONG[dow]}ที่ ${d} ${THAI_MONTH_SHORT[m - 1]} ${y + 543}`;
}
