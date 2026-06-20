"use client";

import { useState } from "react";
import { formatBaht } from "@/lib/baht";
import type { ExpenseByCategory } from "@/lib/insights/aggregate";

/**
 * Ranked expense-by-category rows (amount desc) as proportional CSS bars: each
 * bar's width is its ฿ as a percentage of the top category, so the biggest
 * spend fills the track and the rest read relative to it. Mirrors
 * `RevenueByServiceList` but in the `error` palette (these are costs).
 *
 * Caps the visible list to the top 8 with a "ดูทั้งหมด" expander when there are
 * more (client state — the only interactivity, so the single "use client" here).
 */
const VISIBLE_CAP = 8;

export function ExpensesByCategoryList({ rows }: { rows: ExpenseByCategory[] }) {
  const [expanded, setExpanded] = useState(false);

  const top = Math.max(1, ...rows.map((r) => r.amount));
  const visible = expanded ? rows : rows.slice(0, VISIBLE_CAP);
  const hiddenCount = rows.length - VISIBLE_CAP;

  return (
    <div className="space-y-3.5">
      <ul className="space-y-3.5">
        {visible.map((s, i) => {
          const pct = s.amount <= 0 ? 0 : Math.max(8, Math.round((s.amount / top) * 100));
          const isTop = i === 0;
          return (
            <li key={s.category} className="space-y-1.5">
              <div className="flex items-center justify-between gap-3">
                <span className="min-w-0 flex-1 truncate text-body-md text-on-surface">
                  {s.category}
                </span>
                <span className="shrink-0 font-display text-body-md tabular-nums text-on-surface">
                  {formatBaht(s.amount)}
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-surface-container-high">
                <div
                  className={`h-full rounded-full transition-all ${
                    isTop ? "bg-error" : "bg-error/45"
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-label-sm tabular-nums text-on-surface-variant">
                {s.count} รายการ
              </p>
            </li>
          );
        })}
      </ul>

      {hiddenCount > 0 ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="text-label-md font-semibold text-primary transition-colors hover:text-primary-container"
        >
          {expanded ? "แสดงน้อยลง" : `ดูทั้งหมด (${rows.length})`}
        </button>
      ) : null}
    </div>
  );
}
