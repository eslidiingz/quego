import { cn } from "@/lib/cn";

export type IconProps = React.HTMLAttributes<HTMLSpanElement> & {
  name: string;
  filled?: boolean;
  weight?: 100 | 200 | 300 | 400 | 500 | 600 | 700;
  size?: number | string;
};

export function Icon({
  name,
  filled = false,
  weight = 400,
  size,
  className,
  style,
  ...rest
}: IconProps) {
  const fontSize = typeof size === "number" ? `${size}px` : size;
  return (
    <span
      aria-hidden="true"
      className={cn("material-symbols-outlined leading-none", className)}
      style={{
        fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' ${weight}, 'GRAD' 0, 'opsz' 24`,
        fontSize,
        ...style,
      }}
      {...rest}
    >
      {name}
    </span>
  );
}
