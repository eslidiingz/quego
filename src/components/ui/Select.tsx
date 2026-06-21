"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import { Icon } from "./Icon";
import { RequiredMark } from "./RequiredMark";

/**
 * Custom (non-native) select. Renders a styled button + a portaled listbox
 * instead of a browser `<select>`, so the dropdown matches the design system on
 * every platform and never shows the OS-native popup.
 *
 * Drop-in for the old native select: same API — `label`/`helperText`/`errorText`,
 * `value`/`defaultValue` (controlled or uncontrolled), `onChange` (callers read
 * `e.target.value`), `name` (a hidden input keeps FormData submission working),
 * `required`/`disabled`/`aria-label`/`className`, and `<option>` children
 * (`value`, text, `disabled`). The options are read from the children so call
 * sites don't have to change.
 *
 * Accessibility: WAI-ARIA listbox pattern — `aria-haspopup="listbox"`,
 * `aria-expanded`, roving highlight via Arrow/Home/End, select with Enter/Space,
 * close with Esc, and an outside-click guard. Portals to `document.body` so an
 * ancestor `transform` (e.g. the sliding sidebar) can't trap the fixed panel —
 * same gotcha the Modal/Toast handle.
 */

type Option = { value: string; label: string; disabled: boolean };

export type SelectProps = {
  label?: string;
  helperText?: string;
  errorText?: string;
  name?: string;
  id?: string;
  className?: string;
  value?: string;
  defaultValue?: string;
  /** Called with a native-like event so existing `e.target.value` callers work. */
  onChange?: (event: { target: { value: string; name?: string } }) => void;
  required?: boolean;
  disabled?: boolean;
  "aria-label"?: string;
  children?: React.ReactNode;
};

/** Read `<option>` children into a flat options list (ignores non-option nodes). */
function readOptions(children: React.ReactNode): Option[] {
  const out: Option[] = [];
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child) || child.type !== "option") return;
    const props = child.props as {
      value?: string | number;
      children?: React.ReactNode;
      disabled?: boolean;
    };
    const value = props.value == null ? "" : String(props.value);
    const label =
      typeof props.children === "string" ||
      typeof props.children === "number"
        ? String(props.children)
        : value;
    out.push({ value, label, disabled: Boolean(props.disabled) });
  });
  return out;
}

export function Select({
  label,
  helperText,
  errorText,
  name,
  id,
  className,
  value,
  defaultValue,
  onChange,
  required,
  disabled,
  "aria-label": ariaLabel,
  children,
}: SelectProps) {
  const options = React.useMemo(() => readOptions(children), [children]);
  const reactId = React.useId();
  const inputId = id ?? reactId;
  const listboxId = `${inputId}-listbox`;
  const labelId = label ? `${inputId}-label` : undefined;
  const invalid = Boolean(errorText);
  const isControlled = value !== undefined;

  const firstSelectable = options.find((o) => !o.disabled)?.value ?? "";
  const [internal, setInternal] = React.useState<string>(
    defaultValue ?? (value !== undefined ? value : firstSelectable),
  );
  const selected = isControlled ? (value as string) : internal;

  const [open, setOpen] = React.useState(false);
  const [highlight, setHighlight] = React.useState(0);
  const [mounted, setMounted] = React.useState(false);
  const [rect, setRect] = React.useState<{
    left: number;
    top: number;
    bottom: number;
    width: number;
  } | null>(null);

  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const listRef = React.useRef<HTMLUListElement>(null);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const selectedOption = options.find((o) => o.value === selected);
  const isPlaceholder = !selectedOption || selectedOption.disabled;
  const buttonLabel = selectedOption ? selectedOption.label : "";

  const measure = React.useCallback(() => {
    const el = buttonRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setRect({ left: r.left, top: r.top, bottom: r.bottom, width: r.width });
  }, []);

  const openMenu = React.useCallback(() => {
    if (disabled) return;
    measure();
    const idx = options.findIndex((o) => o.value === selected && !o.disabled);
    setHighlight(idx >= 0 ? idx : options.findIndex((o) => !o.disabled));
    setOpen(true);
  }, [disabled, measure, options, selected]);

  const closeMenu = React.useCallback((focusButton = true) => {
    setOpen(false);
    if (focusButton) buttonRef.current?.focus();
  }, []);

  const commit = React.useCallback(
    (next: string) => {
      if (!isControlled) setInternal(next);
      onChange?.({ target: { value: next, name } });
    },
    [isControlled, name, onChange],
  );

  const selectIndex = React.useCallback(
    (idx: number) => {
      const opt = options[idx];
      if (!opt || opt.disabled) return;
      commit(opt.value);
      closeMenu();
    },
    [options, commit, closeMenu],
  );

  // Reposition while open; close on outside pointer + Escape.
  React.useEffect(() => {
    if (!open) return;
    const onReposition = () => measure();
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (buttonRef.current?.contains(t) || listRef.current?.contains(t)) return;
      closeMenu(false);
    };
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [open, measure, closeMenu]);

  // Keep the highlighted row in view as the user arrows through.
  React.useEffect(() => {
    if (!open) return;
    const node = listRef.current?.querySelector<HTMLElement>(
      `[data-index="${highlight}"]`,
    );
    node?.scrollIntoView({ block: "nearest" });
  }, [open, highlight]);

  function moveHighlight(dir: 1 | -1) {
    setHighlight((cur) => {
      let i = cur;
      for (let step = 0; step < options.length; step += 1) {
        i = (i + dir + options.length) % options.length;
        if (!options[i]?.disabled) return i;
      }
      return cur;
    });
  }

  function onButtonKeyDown(e: React.KeyboardEvent) {
    if (
      e.key === "ArrowDown" ||
      e.key === "ArrowUp" ||
      e.key === "Enter" ||
      e.key === " "
    ) {
      e.preventDefault();
      openMenu();
    }
  }

  function onListKeyDown(e: React.KeyboardEvent) {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        moveHighlight(1);
        break;
      case "ArrowUp":
        e.preventDefault();
        moveHighlight(-1);
        break;
      case "Home":
        e.preventDefault();
        setHighlight(options.findIndex((o) => !o.disabled));
        break;
      case "End":
        e.preventDefault();
        for (let i = options.length - 1; i >= 0; i -= 1) {
          if (!options[i].disabled) {
            setHighlight(i);
            break;
          }
        }
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        selectIndex(highlight);
        break;
      case "Escape":
        e.preventDefault();
        // Don't let a containing Modal's Esc-to-close also fire.
        e.stopPropagation();
        closeMenu();
        break;
      case "Tab":
        closeMenu(false);
        break;
      default:
        break;
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {label ? (
        <label
          id={labelId}
          htmlFor={inputId}
          className="text-label-md text-on-surface-variant"
        >
          {label}
          {required ? <RequiredMark /> : null}
        </label>
      ) : null}

      {/* Hidden field keeps FormData submission working for name-based forms. */}
      {name ? <input type="hidden" name={name} value={selected} /> : null}

      <button
        type="button"
        id={inputId}
        ref={buttonRef}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-label={ariaLabel}
        aria-labelledby={labelId}
        aria-required={required || undefined}
        aria-invalid={invalid || undefined}
        onClick={() => (open ? closeMenu(false) : openMenu())}
        onKeyDown={onButtonKeyDown}
        className={cn(
          // Raised fill (no resting border) — matches Input. The lighter fill
          // lifts the control off the card so it reads as a field without a line.
          "relative w-full h-12 pl-4 pr-12 rounded-lg bg-surface-container-high text-body-md text-left flex items-center transition-all duration-200 ease-out",
          "border-2 border-transparent hover:bg-surface-container-highest focus:bg-surface-container-highest focus:border-primary focus:outline-none disabled:opacity-50 disabled:pointer-events-none",
          isPlaceholder ? "text-outline" : "text-on-surface",
          invalid && "border-error focus:border-error",
          className,
        )}
      >
        <span className="truncate">{buttonLabel}</span>
        <Icon
          name="expand_more"
          className={cn(
            "pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && mounted && rect
        ? createPortal(
            <div
              className="quego-pop-in fixed z-[60]"
              style={{
                left: rect.left,
                width: rect.width,
                // Open below the control; the panel caps its own height.
                top: rect.bottom + 4,
              }}
            >
              <ul
                ref={listRef}
                id={listboxId}
                role="listbox"
                tabIndex={-1}
                aria-labelledby={labelId}
                aria-activedescendant={
                  options[highlight] ? `${inputId}-opt-${highlight}` : undefined
                }
                onKeyDown={onListKeyDown}
                // eslint-disable-next-line jsx-a11y/no-autofocus
                autoFocus
                className="max-h-64 overflow-y-auto rounded-lg border border-outline-variant bg-surface-container-lowest py-1 shadow-luxury focus:outline-none"
              >
                {options.map((opt, idx) => {
                  const isSelected = opt.value === selected;
                  const isHighlighted = idx === highlight;
                  return (
                    <li
                      key={`${opt.value}-${idx}`}
                      id={`${inputId}-opt-${idx}`}
                      role="option"
                      aria-selected={isSelected}
                      aria-disabled={opt.disabled || undefined}
                      data-index={idx}
                      onPointerEnter={() => !opt.disabled && setHighlight(idx)}
                      onClick={() => selectIndex(idx)}
                      className={cn(
                        "flex items-center justify-between gap-2 px-4 py-2.5 text-body-md",
                        opt.disabled
                          ? "cursor-not-allowed text-outline"
                          : "cursor-pointer text-on-surface",
                        isHighlighted &&
                          !opt.disabled &&
                          "bg-surface-container-high",
                        isSelected && !opt.disabled && "text-primary",
                      )}
                    >
                      <span className="truncate">{opt.label}</span>
                      {isSelected && !opt.disabled ? (
                        <Icon
                          name="check"
                          size={18}
                          className="shrink-0 text-primary"
                        />
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>,
            document.body,
          )
        : null}

      {errorText ? (
        <p className="text-label-sm text-error">{errorText}</p>
      ) : helperText ? (
        <p className="text-label-sm text-on-surface-variant">{helperText}</p>
      ) : null}
    </div>
  );
}
