import { Chip } from "@/components/ui/Chip";

/**
 * Period-over-period change indicator: ▲/▼ + percent vs the previous window.
 * Renders nothing when `delta` is null (no prior-period base) so we never show
 * a misleading ∞ or a "+100%" off a zero baseline.
 *
 * Presentational: receives a fractional change (0.12 = +12%); no math beyond
 * sign + rounding.
 */
export function DeltaChip({
  delta,
  size = "sm",
}: {
  delta: number | null;
  size?: "sm" | "md";
}) {
  if (delta == null) return null;

  const pct = Math.round(delta * 100);
  if (pct === 0) {
    return (
      <Chip variant="neutral" size={size}>
        <span aria-hidden="true">±</span>
        <span className="tabular-nums">0%</span>
        <span className="sr-only">เท่าเดิมเทียบช่วงก่อนหน้า</span>
      </Chip>
    );
  }

  const up = pct > 0;
  return (
    <Chip variant={up ? "success" : "danger"} size={size}>
      <span aria-hidden="true">{up ? "▲" : "▼"}</span>
      <span className="tabular-nums">{Math.abs(pct)}%</span>
      <span className="sr-only">
        {up ? "เพิ่มขึ้น" : "ลดลง"} {Math.abs(pct)}% เทียบช่วงก่อนหน้า
      </span>
    </Chip>
  );
}
