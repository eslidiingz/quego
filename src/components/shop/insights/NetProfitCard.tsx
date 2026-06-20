import { formatBaht } from "@/lib/baht";
import { DeltaChip } from "./DeltaChip";

/**
 * Net-profit headline: revenue − expenses over the window, the profit margin
 * behind it, and a ▲/▼ delta vs the previous equal-length window. Green when in
 * profit, red when in the red.
 *
 * Presentational: receives pre-computed numbers (DIP). Currency via `formatBaht`,
 * `tabular-nums` so the big figure stays aligned.
 */
export function NetProfitCard({
  netProfit,
  profitMargin,
  delta,
}: {
  netProfit: number;
  /** netProfit ÷ revenue (0–1+); null when there's no revenue. */
  profitMargin: number | null;
  delta: number | null;
}) {
  const positive = netProfit >= 0;
  return (
    <section className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 md:p-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-label-md text-on-surface-variant">
          กำไรสุทธิ (รายได้ − รายจ่าย)
        </p>
        <DeltaChip delta={delta} size="md" />
      </div>
      <p
        className={`mt-2 font-display text-display-lg leading-none tabular-nums ${
          positive ? "text-success" : "text-error"
        }`}
      >
        {formatBaht(netProfit)}
      </p>
      <p className="mt-2 text-label-md text-on-surface-variant">
        {profitMargin == null
          ? "ยังไม่มีรายได้ในช่วงนี้"
          : `อัตรากำไร ${Math.round(profitMargin * 100)}%`}
      </p>
    </section>
  );
}
