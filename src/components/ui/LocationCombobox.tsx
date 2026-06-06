"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/Icon";
import { searchLocations, type LocationOption } from "@/lib/location/thailand";

export type LocationValue = {
  province: string;
  district: string | null;
  subdistrict: string | null;
};

export function locationLabel(v: LocationValue): string {
  if (v.subdistrict) return `${v.subdistrict}, ${v.district}, ${v.province}`;
  if (v.district) return `${v.district}, ${v.province}`;
  return v.province;
}

/** Material icon by the granularity of an option. */
function levelIcon(opt: LocationOption | LocationValue): string {
  if (opt.subdistrict) return "location_on";
  if (opt.district) return "location_city";
  return "map";
}

/**
 * Type-ahead location picker (จังหวัด / เขต-อำเภอ / แขวง-ตำบล) for the customer
 * surfaces: the landing hero and the discovery filter. Custom in-app dropdown —
 * never a native datalist/select — with full keyboard support (↑/↓/Enter/Esc),
 * per the frontend rules.
 *
 * SRP: surface location suggestions and emit the committed
 * {province, district, subdistrict} (or null when cleared). It owns no filtering
 * and no navigation — the parent decides what to do with the value (DIP).
 * Suggestion data comes from the pure `thailand.ts` dataset, the same source the
 * shop forms validate against.
 *
 * `value` seeds the displayed text once (uncontrolled query thereafter); to
 * reset it programmatically, remount via a `key` prop.
 */
export function LocationCombobox({
  value,
  onChange,
  variant = "field",
  placeholder = "ค้นหาแขวง/ตำบล เขต/อำเภอ หรือจังหวัด",
  ariaLabel = "เลือกพื้นที่",
  id,
  subdistrictFirst = false,
}: {
  value: LocationValue | null;
  onChange: (next: LocationValue | null) => void;
  variant?: "field" | "bare";
  placeholder?: string;
  ariaLabel?: string;
  id?: string;
  /** Surface ตำบล suggestions before อำเภอ/จังหวัด (shop profile autofill). */
  subdistrictFirst?: boolean;
}) {
  const reactId = useId();
  const inputId = id ?? reactId;
  const listId = `${inputId}-list`;
  const [query, setQuery] = useState(value ? locationLabel(value) : "");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  const results =
    open && query.trim() ? searchLocations(query, 10, { subdistrictFirst }) : [];

  // Close when focus/click leaves the component.
  useEffect(() => {
    if (!open) return;
    function onDocPointer(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onDocPointer);
    return () => document.removeEventListener("pointerdown", onDocPointer);
  }, [open]);

  function commit(opt: LocationOption) {
    const next: LocationValue = {
      province: opt.province,
      district: opt.district,
      subdistrict: opt.subdistrict,
    };
    onChange(next);
    setQuery(locationLabel(next));
    setOpen(false);
  }

  function clear() {
    setQuery("");
    setOpen(false);
    onChange(null);
  }

  function handleInput(next: string) {
    setQuery(next);
    setOpen(true);
    setActiveIndex(0);
    // Typing away from a committed selection invalidates it until the user
    // picks a fresh suggestion — a half-typed string must not silently filter.
    if (value && next !== locationLabel(value)) onChange(null);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((i) => Math.min(i + 1, Math.max(results.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (open && results[activeIndex]) {
        e.preventDefault();
        commit(results[activeIndex]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const bare = variant === "bare";

  return (
    <div ref={rootRef} className="relative">
      <div className={cn("relative flex items-center", bare && "text-on-surface")}>
        <span
          className={cn(
            "pointer-events-none absolute flex items-center",
            bare ? "left-1 text-primary" : "left-4 text-on-surface-variant",
          )}
        >
          <Icon name="location_on" size={bare ? 20 : 22} />
        </span>
        <input
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={open && results.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-label={ariaLabel}
          autoComplete="off"
          value={query}
          placeholder={placeholder}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => query.trim() && setOpen(true)}
          onKeyDown={handleKeyDown}
          className={cn(
            "w-full text-body-md text-on-surface placeholder:text-on-surface-variant focus:outline-none",
            bare
              ? "bg-transparent border-none py-2.5 sm:py-3 pl-8 pr-8"
              : "h-12 rounded-lg bg-surface-container-low border-2 border-transparent focus:bg-surface-container-lowest focus:border-primary transition-all pl-12 pr-10",
          )}
        />
        {query ? (
          <button
            type="button"
            onClick={clear}
            aria-label="ล้างพื้นที่"
            className={cn(
              "absolute top-1/2 -translate-y-1/2 p-1 rounded-full text-on-surface-variant hover:bg-surface-container-high transition-colors",
              bare ? "right-0" : "right-3",
            )}
          >
            <Icon name="close" size={18} />
          </button>
        ) : null}
      </div>

      {open && results.length > 0 ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 mt-2 w-full max-h-72 overflow-auto rounded-xl border border-outline-variant bg-surface-container-lowest shadow-lg py-1"
        >
          {results.map((opt, i) => {
            const active = i === activeIndex;
            return (
              <li
                key={opt.label}
                role="option"
                aria-selected={active}
                onMouseEnter={() => setActiveIndex(i)}
                // onMouseDown (not onClick) so it fires before the input blur
                // closes the panel.
                onMouseDown={(e) => {
                  e.preventDefault();
                  commit(opt);
                }}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2.5 cursor-pointer text-body-md",
                  active ? "bg-primary/10 text-primary" : "text-on-surface",
                )}
              >
                <Icon
                  name={levelIcon(opt)}
                  size={18}
                  className={active ? "text-primary" : "text-on-surface-variant"}
                />
                <span className="truncate">{opt.label}</span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
