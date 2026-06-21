"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/Icon";
import { RequiredMark } from "@/components/ui/RequiredMark";
import type { CategoryOption } from "@/lib/services/shops";

/**
 * Short onboarding helper copy per category, keyed by the stable taxonomy slug.
 *
 * Lives in the UI (not the DB) on purpose: it's fixed self-classification
 * guidance for shop owners — e.g. distinguishing a full-service salon (ทำผม)
 * from a men's barber (บาร์เบอร์) — not editable per-shop content. A slug with
 * no entry here just renders without a description (graceful degradation).
 */
const CATEGORY_HINTS: Record<string, string> = {
  hair: "ร้านเสริมสวย/ซาลอน — ตัด สระ ไดร์ ทำสี ดัด ยืด ดูแลผมครบวงจร ทั้งหญิงและชาย",
  barber: "ร้านตัดผมชายโดยเฉพาะ — ตัดผม โกนหนวด แต่งเครา ทรงสุภาพบุรุษ",
  nails: "ทำเล็บมือ–เท้า ทาสีเจล ต่อเล็บ เพ้นท์ลาย",
  "massage-spa": "นวดไทย นวดน้ำมัน สปา ทรีตเมนต์เพื่อผ่อนคลาย",
  "lash-brow": "ต่อขนตา ลิฟต์ขนตา ออกแบบและจัดคิ้ว",
  waxing: "กำจัดขนด้วยแวกซ์ ทุกจุดของร่างกาย",
  facial: "ดูแลผิวหน้า ทรีตเมนต์ มาส์ก กดสิว",
  clinic: "หัตถการความงามโดยแพทย์ — ฉีด เลเซอร์ ดูแลผิว",
  "pmu-tattoo": "สักคิ้วถาวร สักปาก และสักลายบนผิวหนัง",
};

/**
 * Category selector rendered as a compact custom dropdown: collapsed it shows a
 * single row (the chosen category), and only when open does it reveal each
 * option with its description — so owners get the decision-making copy without
 * the always-expanded card grid eating vertical space.
 *
 * A native <select> can't render a two-line styled description per option, so
 * this is a custom listbox. The chosen id rides a hidden <input name="categoryId">
 * so it submits with the existing form contract unchanged. No portal is needed:
 * the registration form has no `transform` ancestor (unlike the admin sidebar),
 * so an absolutely-positioned panel anchors correctly to the trigger.
 */
export function CategoryPicker({
  categories,
  defaultValue,
  errorText,
  disabled,
}: {
  categories: CategoryOption[];
  defaultValue?: string;
  errorText?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(defaultValue ?? "");
  // Keyboard-highlighted option while the list is open (-1 = none).
  const [activeIndex, setActiveIndex] = useState(-1);

  const rootRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<(HTMLLIElement | null)[]>([]);
  const baseId = useId();
  const listId = `${baseId}-list`;

  const invalid = Boolean(errorText);
  const selected = categories.find((c) => c.id === selectedId) ?? null;

  // Close when clicking outside the control.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  // Keep the keyboard-highlighted option scrolled into view.
  useEffect(() => {
    if (open && activeIndex >= 0) {
      optionRefs.current[activeIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [open, activeIndex]);

  function openMenu() {
    if (disabled) return;
    const idx = categories.findIndex((c) => c.id === selectedId);
    setActiveIndex(idx >= 0 ? idx : 0);
    setOpen(true);
  }

  function choose(id: string) {
    setSelectedId(id);
    setOpen(false);
  }

  function onTriggerKeyDown(e: React.KeyboardEvent) {
    if (disabled) return;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (!open) openMenu();
        else setActiveIndex((i) => Math.min(i + 1, categories.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        if (open) setActiveIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (!open) openMenu();
        else if (activeIndex >= 0) choose(categories[activeIndex].id);
        break;
      case "Escape":
        if (open) {
          e.preventDefault();
          setOpen(false);
        }
        break;
      case "Tab":
        setOpen(false);
        break;
    }
  }

  return (
    <div className="flex flex-col gap-2" ref={rootRef}>
      <span id={`${baseId}-label`} className="text-label-md text-on-surface-variant">
        ประเภทธุรกิจ
        <RequiredMark />
      </span>

      {/* Submitted value — the rest of the control is presentational. */}
      <input type="hidden" name="categoryId" value={selectedId} />

      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => (open ? setOpen(false) : openMenu())}
          onKeyDown={onTriggerKeyDown}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-labelledby={`${baseId}-label`}
          aria-required="true"
          aria-invalid={invalid || undefined}
          className={cn(
            // Raised fill — matches Input/Select so every field on the form reads
            // the same. high lifts off the card; hover/focus/open lift to highest.
            "w-full h-12 pl-4 pr-12 rounded-lg bg-surface-container-high text-body-md text-left flex items-center transition-all duration-200 ease-out",
            "border-2 border-transparent hover:bg-surface-container-highest focus:bg-surface-container-highest focus:border-primary focus:outline-none",
            open && "bg-surface-container-highest border-primary",
            invalid && "border-error focus:border-error",
            disabled && "opacity-60 cursor-not-allowed",
          )}
        >
          <span
            className={cn(
              "truncate",
              selected ? "text-on-surface" : "text-on-surface-variant",
            )}
          >
            {selected ? selected.name : "เลือกประเภทธุรกิจ"}
          </span>
          <Icon
            name="expand_more"
            className={cn(
              "pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant transition-transform duration-200",
              open && "rotate-180",
            )}
          />
        </button>

        {open ? (
          <ul
            id={listId}
            role="listbox"
            aria-labelledby={`${baseId}-label`}
            aria-activedescendant={
              activeIndex >= 0 ? `${baseId}-opt-${activeIndex}` : undefined
            }
            className="absolute z-20 mt-1 w-full max-h-72 overflow-auto rounded-xl border border-outline-variant bg-surface-container-lowest shadow-lg p-1"
          >
            {categories.map((c, i) => {
              const isSelected = c.id === selectedId;
              const isActive = i === activeIndex;
              const hint = CATEGORY_HINTS[c.slug];
              return (
                <li
                  key={c.id}
                  id={`${baseId}-opt-${i}`}
                  ref={(el) => {
                    optionRefs.current[i] = el;
                  }}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => choose(c.id)}
                  className={cn(
                    "flex cursor-pointer items-start gap-2 rounded-lg px-3 py-2.5 transition-colors",
                    isActive ? "bg-primary-container/15" : "hover:bg-surface-container",
                  )}
                >
                  <span className="flex-1 min-w-0">
                    <span className="block text-body-md font-medium text-on-surface">
                      {c.name}
                    </span>
                    {hint ? (
                      <span className="block text-label-sm text-on-surface-variant leading-snug">
                        {hint}
                      </span>
                    ) : null}
                  </span>
                  {isSelected ? (
                    <Icon name="check" className="text-primary shrink-0 mt-0.5" />
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>

      {errorText ? <p className="text-label-sm text-error">{errorText}</p> : null}
    </div>
  );
}
