"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

export type StarRatingInputProps = {
  /** Currently selected rating (1–5, or 0 for "none chosen yet"). */
  value: number;
  onChange: (value: number) => void;
  /** Star glyph size in px. */
  size?: number;
  disabled?: boolean;
};

/**
 * Interactive whole-star (1–5) picker. Single responsibility: let the user
 * choose an integer rating. It owns only ephemeral hover state — the committed
 * value is controlled by the parent (DIP: the persistence decision lives up at
 * the form, not here).
 *
 * Each star is a real <button>, so it's natively keyboard-focusable and
 * Space/Enter activates it. Hover (mouse) previews the fill up to the pointer.
 */
export function StarRatingInput({
  value,
  onChange,
  size = 36,
  disabled = false,
}: StarRatingInputProps) {
  const [hover, setHover] = useState<number | null>(null);
  // While hovering, preview the hovered count; otherwise show the committed value.
  const shown = hover ?? value;

  return (
    <div
      className="inline-flex items-center gap-1"
      onMouseLeave={() => setHover(null)}
    >
      {[1, 2, 3, 4, 5].map((n) => {
        const isFilled = n <= shown;
        return (
          <button
            key={n}
            type="button"
            disabled={disabled}
            aria-label={`${n} ดาว`}
            aria-pressed={n === value}
            onClick={() => onChange(n)}
            onMouseEnter={() => !disabled && setHover(n)}
            className={cn(
              "rounded-md p-0.5 transition-transform duration-150 ease-out",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
              !disabled && "hover:scale-110 active:scale-95 cursor-pointer",
              disabled && "cursor-not-allowed opacity-60",
            )}
          >
            <Icon
              name="star"
              filled={isFilled}
              size={size}
              className={isFilled ? "text-tertiary" : "text-on-surface-variant/30"}
            />
          </button>
        );
      })}
    </div>
  );
}
