/**
 * Pure formatting for LINE message bodies. SRP: turn booking facts into the
 * Thai text we push — no channel, no DB, no persona logic. Both the shop-facing
 * new-booking notice (services/shop-line.ts) and the customer-facing
 * confirmation (services/line-linking.ts) share one layout: a heading, a single
 * identity line, an optional service line, then the date + time line. Pure and
 * framework-free so it is unit-tested without a live channel and importable from
 * either persona's service.
 */

/** "YYYY-MM-DD" → "DD/MM/YYYY" — locale-independent so the test is stable. */
export function formatBookingDate(ymd: string): string {
  const [y, m, d] = ymd.split("-");
  return `${d}/${m}/${y}`;
}

export type BookingMessageParts = {
  /** First line, e.g. "🔔 มีการจองใหม่" or "✅ ยืนยันการจอง". */
  heading: string;
  /** The who line, already labelled, e.g. "ลูกค้า: สมชาย" or "ร้าน: ร้านโจ". */
  identityLine: string;
  serviceName: string | null;
  bookingDate: string; // "YYYY-MM-DD"
  slotTime: string; // "HH:MM"
};

/**
 * Assemble the shared booking-message layout. The service line is omitted when
 * no service is set. Each persona supplies only its own heading + identity line.
 */
export function buildBookingMessage(parts: BookingMessageParts): string {
  const lines = [parts.heading, parts.identityLine];
  if (parts.serviceName) {
    lines.push(`บริการ: ${parts.serviceName}`);
  }
  lines.push(
    `วันเวลา: ${formatBookingDate(parts.bookingDate)} ${parts.slotTime} น.`,
  );
  return lines.join("\n");
}
