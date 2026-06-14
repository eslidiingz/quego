import { formatBaht } from "@/lib/baht";
import { DeltaChip } from "./DeltaChip";

/**
 * The report's headline: estimated revenue over the window, the count of served
 * queues behind it, and a ▲/▼ delta vs the previous equal-length window.
 *
 * Presentational: receives pre-computed numbers (DIP). Currency via `formatBaht`,
 * `tabular-nums` so the big figure stays aligned.
 */
export function RevenueHeroCard({
  revenue,
  servedCount,
  delta,
}: {
  revenue: number;
  servedCount: number;
  delta: number | null;
}) {
  return (
    <section className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 md:p-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-label-md text-on-surface-variant">รายได้โดยประมาณ</p>
        <DeltaChip delta={delta} size="md" />
      </div>
      <p className="mt-2 font-display text-display-lg leading-none tabular-nums text-secondary">
        {formatBaht(revenue)}
      </p>
      <p className="mt-2 text-label-md text-on-surface-variant">
        จาก {servedCount.toLocaleString("th-TH")} คิวที่ให้บริการแล้ว
      </p>
    </section>
  );
}
