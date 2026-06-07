"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/Icon";
import { BusinessHoursDisplay } from "./BusinessHoursDisplay";
import type { BusinessHour } from "@/lib/services/business-hours";

type Day = 0 | 1 | 2 | 3 | 4 | 5 | 6;

const DAY_LABELS: Record<Day, string> = {
  0: "อาทิตย์",
  1: "จันทร์",
  2: "อังคาร",
  3: "พุธ",
  4: "พฤหัสบดี",
  5: "ศุกร์",
  6: "เสาร์",
};

/**
 * Collapsible business-hours panel for the shop detail page. Most customers
 * only need "is it open today and until when" — so we surface TODAY's hours up
 * front and tuck the full week behind a "ดูทั้งสัปดาห์" toggle, cutting the
 * page's scroll length.
 *
 * SRP: own the expand/collapse state + today's summary row. The full-week
 * table render is delegated to {@link BusinessHoursDisplay} (OCP — we extend
 * it, never modify it).
 */
export function BusinessHoursPanel({
  hours,
  currentDay,
}: {
  hours: BusinessHour[];
  currentDay: Day;
}) {
  const [expanded, setExpanded] = useState(false);

  const today = hours.find((h) => h.dayOfWeek === currentDay);
  const isOpenToday = Boolean(today?.isOpen && today.openTime && today.closeTime);
  const todayText = isOpenToday
    ? `${today!.openTime} — ${today!.closeTime}`
    : "ปิดวันนี้";

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="w-full flex items-center justify-between gap-3 px-5 md:px-6 py-4 text-left hover:bg-surface-container-low/50 transition-colors"
      >
        <span className="flex items-center gap-2 min-w-0">
          <Icon name="schedule" size={18} className="text-primary shrink-0" />
          <span className="text-body-md text-on-surface">
            วันนี้ ({DAY_LABELS[currentDay]})
          </span>
        </span>
        <span className="flex items-center gap-2 shrink-0">
          <span
            className={cn(
              "text-body-md tabular-nums",
              isOpenToday
                ? "text-on-surface font-medium"
                : "text-on-surface-variant",
            )}
          >
            {todayText}
          </span>
          <span className="text-label-sm text-on-surface-variant hidden sm:inline">
            {expanded ? "ย่อ" : "ดูทั้งสัปดาห์"}
          </span>
          <Icon
            name="expand_more"
            size={20}
            className={cn(
              "text-on-surface-variant transition-transform duration-200",
              expanded && "rotate-180",
            )}
          />
        </span>
      </button>

      {expanded ? (
        <div className="border-t border-outline-variant/40">
          <BusinessHoursDisplay hours={hours} currentDay={currentDay} />
        </div>
      ) : null}
    </div>
  );
}
