"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { formatBaht } from "@/lib/baht";

export type ServiceListItem = {
  id: string;
  name: string;
  durationMinutes: number;
  price: number | null;
};

export type ServiceListProps = {
  services: ServiceListItem[];
  /** How many services to show before the "ดูบริการทั้งหมด" control. */
  initialCount?: number;
};

/**
 * Client island that keeps the services catalogue compact by default: it
 * renders only the first `initialCount` services and exposes a single toggle to
 * reveal the rest (and collapse them again). Mirrors {@link ReviewList}'s
 * show-more pattern. All services are already loaded by the page, so expanding
 * is instant with no extra fetch.
 */
export function ServiceList({ services, initialCount = 5 }: ServiceListProps) {
  const [expanded, setExpanded] = useState(false);
  const hasMore = services.length > initialCount;
  const visible = expanded ? services : services.slice(0, initialCount);
  const hiddenCount = services.length - initialCount;

  return (
    <>
      <ul className="divide-y divide-outline-variant/40">
        {visible.map((service) => (
          <li
            key={service.id}
            className="px-5 md:px-6 py-4 flex items-center justify-between gap-4"
          >
            <div className="min-w-0">
              <p className="text-body-md font-medium text-on-surface">
                {service.name}
              </p>
              <p className="text-label-sm text-on-surface-variant flex items-center gap-1 mt-0.5">
                <Icon name="schedule" size={14} />
                {formatDuration(service.durationMinutes)}
              </p>
            </div>
            {service.price != null ? (
              <span className="text-body-md font-semibold text-primary shrink-0">
                {formatBaht(service.price)}
              </span>
            ) : null}
          </li>
        ))}
      </ul>

      {hasMore ? (
        <div className="px-5 md:px-6 py-4 border-t border-outline-variant/40">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="inline-flex items-center justify-center gap-1.5 w-full h-11 rounded-full border-2 border-outline-variant text-on-surface text-label-md font-medium hover:bg-surface-container-low hover:border-outline active:scale-[0.99] transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            {expanded ? (
              <>
                ย่อรายการ
                <Icon name="expand_less" size={18} />
              </>
            ) : (
              <>
                ดูอีก {hiddenCount} บริการ
                <Icon name="expand_more" size={18} />
              </>
            )}
          </button>
        </div>
      ) : null}
    </>
  );
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} นาที`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  if (rem === 0) return `${hours} ชั่วโมง`;
  return `${hours} ชม. ${rem} นาที`;
}
