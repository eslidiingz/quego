"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/Icon";
import { RequiredMark } from "@/components/ui/RequiredMark";
import {
  searchLocationsByLevel,
  type LocationLevel,
  type LocationOption,
} from "@/lib/location/thailand";

/** Material icon per address level — mirrors the granularity of the field. */
const LEVEL_ICON: Record<LocationLevel, string> = {
  subdistrict: "home",
  district: "location_city",
  province: "map",
};

/**
 * One searchable address field (ตำบล / อำเภอ / จังหวัด) for the shop-profile
 * location picker. Typing searches the dataset at this field's `level` —
 * subdistrict/district return full ตำบล→อำเภอ→จังหวัด rows, province returns
 * province-only rows — and committing a suggestion emits the whole
 * {@link LocationOption} so the parent can fill the sibling fields.
 *
 * Display model: shows the committed `value` while idle and the live query
 * while editing. A half-typed query can never escape — blurring or clicking
 * away without picking reverts to `value`, so the field only ever holds a
 * canonical name; the parent owns the authoritative triple.
 *
 * SRP: search + display one level and report the pick/clear. It owns no triple
 * reconciliation and no form submission — the parent {@link LocationSearchPicker}
 * does (DIP). Chrome (label / asterisk / error) mirrors {@link Input}.
 */
export function LocationFieldCombobox({
  level,
  value,
  onPick,
  onClear,
  label,
  placeholder,
  errorText,
  helperText,
  disabled = false,
  required = false,
  id,
}: {
  level: LocationLevel;
  value: string;
  onPick: (opt: LocationOption) => void;
  onClear: () => void;
  label: string;
  placeholder: string;
  errorText?: string;
  helperText?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
}) {
  const reactId = useId();
  const inputId = id ?? reactId;
  const listId = `${inputId}-list`;
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  const display = editing ? query : value;
  const results =
    open && query.trim() ? searchLocationsByLevel(query, level, 10) : [];
  const invalid = Boolean(errorText);

  // Close + discard a half-typed query when focus/click leaves the field, so
  // the input can never be left holding a non-canonical string.
  useEffect(() => {
    if (!open && !editing) return;
    function onDocPointer(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setEditing(false);
        setQuery("");
      }
    }
    document.addEventListener("pointerdown", onDocPointer);
    return () => document.removeEventListener("pointerdown", onDocPointer);
  }, [open, editing]);

  function startEditing(next: string) {
    setEditing(true);
    setQuery(next);
    setActiveIndex(0);
  }

  function commit(opt: LocationOption) {
    onPick(opt);
    // Parent updates `value`; revert to display mode so it shows the new value.
    setEditing(false);
    setQuery("");
    setOpen(false);
  }

  function reset() {
    setEditing(false);
    setQuery("");
    setOpen(false);
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
      reset();
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={inputId} className="text-label-md text-on-surface-variant">
        {label}
        {required ? <RequiredMark /> : null}
      </label>
      <div ref={rootRef} className="relative">
        <div className="relative flex items-center">
          <span className="pointer-events-none absolute left-4 flex items-center text-on-surface-variant">
            <Icon name={LEVEL_ICON[level]} size={22} />
          </span>
          <input
            id={inputId}
            type="text"
            role="combobox"
            aria-expanded={open && results.length > 0}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-label={label}
            aria-invalid={invalid || undefined}
            aria-required={required || undefined}
            autoComplete="off"
            disabled={disabled}
            value={display}
            placeholder={placeholder}
            onFocus={(e) => {
              startEditing(value);
              setOpen(Boolean(value.trim()));
              e.target.select();
            }}
            onChange={(e) => {
              startEditing(e.target.value);
              setOpen(true);
            }}
            onKeyDown={handleKeyDown}
            className={cn(
              "w-full h-12 rounded-lg bg-surface-container-low text-on-surface placeholder:text-outline text-body-md transition-all",
              "border-2 border-transparent focus:bg-surface-container-lowest focus:border-primary focus:outline-none",
              "pl-12",
              display ? "pr-10" : "pr-4",
              invalid && "border-error focus:border-error",
            )}
          />
          {display && !disabled ? (
            <button
              type="button"
              onClick={() => {
                onClear();
                reset();
              }}
              aria-label={`ล้าง${label}`}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-on-surface-variant hover:bg-surface-container-high transition-colors duration-200 ease-out"
            >
              <Icon name="close" size={18} />
            </button>
          ) : null}
        </div>

        {open && results.length > 0 ? (
          <ul
            id={listId}
            role="listbox"
            className="quego-pop-in absolute z-50 mt-2 w-full max-h-72 overflow-auto rounded-xl border border-outline-variant bg-surface-container-lowest shadow-lg py-1"
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
                    name={LEVEL_ICON[level]}
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

      {errorText ? (
        <p className="text-label-sm text-error">{errorText}</p>
      ) : helperText ? (
        <p className="text-label-sm text-on-surface-variant">{helperText}</p>
      ) : null}
    </div>
  );
}
