"use client";

import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

const STORAGE_KEY = "queva-theme";

/**
 * Single-tap light/dark switch. The displayed icon is driven purely by the
 * `.dark` class on <html> (set before first paint by the inline script in the
 * root layout) via the `dark:` variant — so the correct glyph shows instantly
 * with no hydration mismatch and no flicker, and no React state is needed.
 *
 * On click we read the live theme from the DOM, flip it, persist the choice,
 * and briefly enable a colour transition (`.theme-transition`) so the swap
 * eases instead of snapping. Default theme (no stored choice) follows the OS;
 * see the inline bootstrap in `src/app/layout.tsx`.
 *
 * SRP: owns the theme-switch interaction only. `className` lets a host tune the
 * colour for its surface (e.g. on the teal auth hero) without new props.
 */
export function ThemeToggle({ className }: { className?: string }) {
  function toggle() {
    const root = document.documentElement;
    const next = root.classList.contains("dark") ? "light" : "dark";

    root.classList.add("theme-transition");
    window.setTimeout(() => root.classList.remove("theme-transition"), 260);

    root.classList.toggle("dark", next === "dark");
    root.style.colorScheme = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* private mode / storage disabled — theme still applies for this session */
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      // Action is symmetric (it toggles); a state-independent label keeps the
      // markup identical on server + client.
      aria-label="สลับโหมดสว่าง / มืด"
      title="สลับโหมดสว่าง / มืด"
      className={cn(
        "inline-flex items-center justify-center size-10 shrink-0 rounded-full",
        "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface",
        "transition-[background-color,color,transform] active:scale-95",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
        className,
      )}
    >
      {/* Icon shows the destination: moon in light mode, sun in dark mode.
          The wrapper spans (not the icon glyph) carry the display toggle —
          the Material Symbols font CSS forces display:block on
          .material-symbols-outlined, which would beat `hidden` on the glyph
          itself, so we toggle a plain wrapper instead. */}
      <span className="flex items-center justify-center dark:hidden">
        <Icon name="dark_mode" size={22} />
      </span>
      <span className="hidden items-center justify-center dark:flex">
        <Icon name="light_mode" size={22} />
      </span>
    </button>
  );
}
