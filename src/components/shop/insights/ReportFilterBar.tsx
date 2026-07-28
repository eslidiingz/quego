"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { TOUR_ANCHORS } from "@/lib/tour/anchors";
import type { FilterOption } from "@/lib/services/insights";
import { FilterSheet } from "./FilterSheet";

/**
 * Filter controls for the shop report: a "ตัวกรอง" trigger (with a coral dot
 * when any staff/service filter is active) and one removable chip per selected
 * staff/service. Owns only the sheet's open/closed state — the filter values
 * themselves live in the URL (server-rendered), so this island stays thin.
 */
export function ReportFilterBar({
  range,
  staffOptions,
  serviceOptions,
  activeStaffIds,
  activeServiceIds,
}: {
  /** The active `?range=` token (preset or calendar), preserved in filter URLs. */
  range: string;
  staffOptions: FilterOption[];
  serviceOptions: FilterOption[];
  activeStaffIds: string[];
  activeServiceIds: string[];
}) {
  const [open, setOpen] = useState(false);

  const nameOf = (opts: FilterOption[], id: string) =>
    opts.find((o) => o.id === id)?.name ?? id;
  const hasFilter = activeStaffIds.length > 0 || activeServiceIds.length > 0;

  // URL with a single id removed from its group (keeps the rest + the range).
  const hrefWithout = (group: "staff" | "service", id: string) => {
    const params = new URLSearchParams({ range });
    const staff =
      group === "staff" ? activeStaffIds.filter((x) => x !== id) : activeStaffIds;
    const service =
      group === "service" ? activeServiceIds.filter((x) => x !== id) : activeServiceIds;
    if (staff.length) params.set("staff", staff.join(","));
    if (service.length) params.set("service", service.join(","));
    return `/shop/insights?${params.toString()}`;
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        // The component returns a fragment, so the trigger carries the anchor.
        data-tour={TOUR_ANCHORS.insightsFilter}
        className="relative inline-flex shrink-0 items-center gap-2 rounded-full border border-outline-variant bg-surface-container-lowest px-4 py-2 text-label-md font-medium text-on-surface transition-colors hover:bg-surface-container-high"
      >
        <Icon name="tune" size={18} />
        ตัวกรอง
        {hasFilter ? (
          <span
            aria-hidden="true"
            className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-secondary ring-2 ring-surface-container-lowest"
          />
        ) : null}
      </button>

      {hasFilter ? (
        <div className="flex w-full flex-wrap items-center gap-2">
          {activeStaffIds.map((id) => (
            <RemovableChip
              key={`staff-${id}`}
              label={nameOf(staffOptions, id)}
              icon="person"
              href={hrefWithout("staff", id)}
            />
          ))}
          {activeServiceIds.map((id) => (
            <RemovableChip
              key={`service-${id}`}
              label={nameOf(serviceOptions, id)}
              icon="content_cut"
              href={hrefWithout("service", id)}
            />
          ))}
          <Link
            href={`/shop/insights?range=${range}`}
            scroll={false}
            className="text-label-md font-semibold text-primary transition-colors hover:text-primary-container"
          >
            ล้างทั้งหมด
          </Link>
        </div>
      ) : null}

      <FilterSheet
        open={open}
        onClose={() => setOpen(false)}
        range={range}
        staffOptions={staffOptions}
        serviceOptions={serviceOptions}
        activeStaffIds={activeStaffIds}
        activeServiceIds={activeServiceIds}
      />
    </>
  );
}

/** An active-filter chip with a leading category icon and an inline remove (×). */
function RemovableChip({
  label,
  icon,
  href,
}: {
  label: string;
  icon: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      className="inline-flex items-center gap-1 rounded-full bg-surface-container-high px-3 py-1 text-label-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-container-highest"
    >
      <Icon name={icon} size={14} className="text-on-surface-variant/70" />
      <span className="max-w-[10rem] truncate">{label}</span>
      <Icon name="close" size={16} aria-label="ลบตัวกรอง" />
    </Link>
  );
}
