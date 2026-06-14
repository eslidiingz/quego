"use client";

import { useState } from "react";
import { formatBaht } from "@/lib/baht";
import type { RevenueByService } from "@/lib/insights/aggregate";

/**
 * Ranked service-revenue rows (revenue desc) as proportional CSS bars: each
 * bar's width is its ฿ as a percentage of the top earner, so the leader fills
 * the track and the rest read relative to it at a glance. Top earner is
 * full-colour; the rest are lighter. A min-width floor keeps tiny bars visible.
 *
 * Caps the visible list to the top 8 with a "ดูทั้งหมด" expander when there are
 * more (client state — the only interactivity here, so this is the single
 * "use client" island in the section).
 */
const VISIBLE_CAP = 8;

export function RevenueByServiceList({ rows }: { rows: RevenueByService[] }) {
  const [expanded, setExpanded] = useState(false);

  const top = Math.max(1, ...rows.map((r) => r.revenue));
  const visible = expanded ? rows : rows.slice(0, VISIBLE_CAP);
  const hiddenCount = rows.length - VISIBLE_CAP;

  return (
    <div className="space-y-3.5">
      <ul className="space-y-3.5">
        {visible.map((s, i) => {
          const pct = s.revenue <= 0 ? 0 : Math.max(8, Math.round((s.revenue / top) * 100));
          const isTop = i === 0;
          return (
            <li key={s.serviceId ?? "unspecified"} className="space-y-1.5">
              <div className="flex items-center justify-between gap-3">
                <span className="min-w-0 flex-1 truncate text-body-md text-on-surface">
                  {s.name}
                </span>
                <span className="shrink-0 font-display text-body-md tabular-nums text-on-surface">
                  {formatBaht(s.revenue)}
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-surface-container-high">
                <div
                  className={`h-full rounded-full transition-all ${
                    isTop ? "bg-tertiary" : "bg-tertiary/45"
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-label-sm tabular-nums text-on-surface-variant">
                {s.bookingCount} คิว
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
