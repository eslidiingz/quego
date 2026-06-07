import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

export type StarRatingDisplayProps = {
  /** Rating to render. Rounded to the nearest whole star for the fill count. */
  value: number;
  /** Star glyph size in px. */
  size?: number;
  className?: string;
};

/**
 * Static, stateless 5-star display. Single responsibility: paint N filled gold
 * stars (N = round(value)) and the rest muted. No interactivity, no state —
 * use {@link StarRatingInput} for the picker.
 */
export function StarRatingDisplay({
  value,
  size = 18,
  className,
}: StarRatingDisplayProps) {
  const filled = Math.max(0, Math.min(5, Math.round(value)));
  return (
    <span
      className={cn("inline-flex items-center gap-0.5", className)}
      role="img"
      aria-label={`${filled} จาก 5 ดาว`}
    >
      {[1, 2, 3, 4, 5].map((n) => {
        const isFilled = n <= filled;
        return (
          <Icon
            key={n}
            name="star"
            filled={isFilled}
            size={size}
            className={isFilled ? "text-tertiary" : "text-outline-variant"}
          />
        );
      })}
    </span>
  );
}
