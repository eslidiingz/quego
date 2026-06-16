"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import type { FilterOption } from "@/lib/services/insights";
import type { InsightsRange } from "@/lib/insights/aggregate";

/**
 * Bottom-sheet filter for the shop report. Portals to <body> (the ShopShell
 * sidebar uses `translate-x-*`, which would otherwise become the containing
 * block for this `position: fixed` sheet and trap it in the 288px column — the
 * documented portal gotcha). MULTI-select staff + service chips; applying
 * composes the `?range/staff/service` URL (comma-separated ids) and navigates,
 * matching the page's server-rendered, no-client-store philosophy.
 *
 * Selection lives in local draft state and is only committed on "ดูรายงาน", so
 * tapping chips doesn't fire navigations mid-edit.
 */
export function FilterSheet({
  open,
  onClose,
  range,
  staffOptions,
  serviceOptions,
  activeStaffIds,
  activeServiceIds,
}: {
  open: boolean;
  onClose: () => void;
  range: InsightsRange;
  staffOptions: FilterOption[];
  serviceOptions: FilterOption[];
  activeStaffIds: string[];
  activeServiceIds: string[];
}) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [draftStaff, setDraftStaff] = useState<string[]>(activeStaffIds);
  const [draftService, setDraftService] = useState<string[]>(activeServiceIds);

  useEffect(() => {
    // SSR portal guard: flip on first client mount so `document` is defined.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // Re-sync the draft to the committed filters whenever the sheet (re)opens, so
  // a cancelled edit doesn't leak into the next open.
  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraftStaff(activeStaffIds);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraftService(activeServiceIds);
  }, [open, activeStaffIds, activeServiceIds]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  const toggle = (list: string[], id: string) =>
    list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

  const apply = () => {
    const params = new URLSearchParams({ range });
    if (draftStaff.length) params.set("staff", draftStaff.join(","));
    if (draftService.length) params.set("service", draftService.join(","));
    router.push(`/shop/insights?${params.toString()}`, { scroll: false });
    onClose();
  };

  const clear = () => {
    setDraftStaff([]);
    setDraftService([]);
  };

  return createPortal(
    <div
      className="quego-overlay-in fixed inset-0 z-50 flex items-end justify-center bg-on-surface/40 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="filter-sheet-title"
        className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-t-2xl border border-outline-variant bg-surface-container-lowest shadow-luxury"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center pt-3">
          <span aria-hidden="true" className="h-1.5 w-10 rounded-full bg-outline-variant" />
        </div>
        <div className="flex items-center justify-between px-6 pb-4 pt-3">
          <h2 id="filter-sheet-title" className="font-display text-headline-md text-on-surface">
            ตัวกรอง
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิด"
            className="inline-flex size-10 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-low"
          >
            <Icon name="close" />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 pb-2">
          {staffOptions.length > 0 ? (
            <FilterGroup label="พนักงาน">
              <ChipOption
                label="ทุกพนักงาน"
                selected={draftStaff.length === 0}
                onSelect={() => setDraftStaff([])}
              />
              {staffOptions.map((s) => (
                <ChipOption
                  key={s.id}
                  label={s.name}
                  selected={draftStaff.includes(s.id)}
                  onSelect={() => setDraftStaff((cur) => toggle(cur, s.id))}
                />
              ))}
            </FilterGroup>
          ) : null}

          {serviceOptions.length > 0 ? (
            <FilterGroup label="บริการ">
              <ChipOption
                label="ทุกบริการ"
                selected={draftService.length === 0}
                onSelect={() => setDraftService([])}
              />
              {serviceOptions.map((s) => (
                <ChipOption
                  key={s.id}
                  label={s.name}
                  selected={draftService.includes(s.id)}
                  onSelect={() => setDraftService((cur) => toggle(cur, s.id))}
                />
              ))}
            </FilterGroup>
          ) : null}
        </div>

        <div className="flex gap-3 border-t border-outline-variant bg-surface-container-low/50 p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] [&>*]:flex-1">
          <Button variant="outline" onClick={clear} iconLeft={<Icon name="filter_alt_off" size={18} />}>
            ล้าง
          </Button>
          <Button variant="primary" onClick={apply} iconLeft={<Icon name="bar_chart" size={18} />}>
            ดูรายงาน
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="text-label-md font-semibold text-on-surface">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

/** A multi-select option pill. Selected = solid primary; unselected = neutral. */
function ChipOption({
  label,
  selected,
  onSelect,
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "rounded-full px-4 py-2 text-label-md font-medium transition-colors",
        selected
          ? "bg-primary text-on-primary"
          : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest",
      )}
    >
      {label}
    </button>
  );
}
