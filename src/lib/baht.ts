/**
 * Format a number as a Thai Baht string, e.g. 350 → "฿350", 1200.5 → "฿1,200.5".
 * The single source of truth for rendering money across the app — discovery
 * cards, shop/booking pages, service & preset management, and confirmations.
 */
export function formatBaht(price: number): string {
  return `฿${price.toLocaleString("th-TH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}
