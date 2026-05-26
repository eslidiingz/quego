import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/Icon";
import type { BusinessHour } from "@/lib/services/business-hours";

const DISPLAY_ORDER: { day: 0 | 1 | 2 | 3 | 4 | 5 | 6; label: string }[] = [
  { day: 1, label: "จันทร์" },
  { day: 2, label: "อังคาร" },
  { day: 3, label: "พุธ" },
  { day: 4, label: "พฤหัสบดี" },
  { day: 5, label: "ศุกร์" },
  { day: 6, label: "เสาร์" },
  { day: 0, label: "อาทิตย์" },
];

/**
 * Read-only weekly business-hours table for the customer detail view.
 * Highlights `currentDay` with a primary background so the user can spot
 * "what does today look like" at a glance.
 *
 * SRP: present static schedule data. Doesn't fetch or compute "open now"
 * — that's the page's concern.
 */
export function BusinessHoursDisplay({
  hours,
  currentDay,
}: {
  hours: BusinessHour[];
  currentDay?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
}) {
  const byDay = new Map<number, BusinessHour>();
  for (const h of hours) byDay.set(h.dayOfWeek, h);

  return (
    <ul className="divide-y divide-outline-variant/30">
      {DISPLAY_ORDER.map(({ day, label }) => {
        const data = byDay.get(day);
        const isToday = currentDay === day;
        return (
          <li
            key={day}
            className={cn(
              "flex items-center justify-between px-4 py-3",
              isToday && "bg-primary-container/15",
            )}
          >
            <span
              className={cn(
                "text-body-md inline-flex items-center gap-2",
                isToday ? "font-bold text-primary" : "text-on-surface",
              )}
            >
              {label}
              {isToday ? (
                <span className="text-label-sm uppercase tracking-widest text-primary">
                  วันนี้
                </span>
              ) : null}
            </span>
            {data?.isOpen && data.openTime && data.closeTime ? (
              <span className="text-body-md tabular-nums text-on-surface">
                {data.openTime} — {data.closeTime}
              </span>
            ) : (
              <span className="text-body-md text-on-surface-variant inline-flex items-center gap-1">
                <Icon name="block" size={16} />
                ปิด
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
