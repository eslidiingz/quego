import { cn } from "@/lib/cn";

export type AvatarProps = {
  src?: string;
  alt?: string;
  initials?: string;
  size?: "sm" | "md" | "lg" | "xl";
  ring?: "none" | "primary" | "secondary";
  status?: "online" | "offline" | "away";
  className?: string;
};

const sizes = {
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-12 h-12 text-base",
  xl: "w-16 h-16 text-lg",
};

const rings = {
  none: "",
  primary: "ring-2 ring-primary ring-offset-2 ring-offset-surface",
  secondary: "ring-2 ring-secondary ring-offset-2 ring-offset-surface",
};

const statusColors = {
  online: "bg-primary",
  offline: "bg-outline",
  away: "bg-secondary",
};

export function Avatar({
  src,
  alt = "",
  initials,
  size = "md",
  ring = "none",
  status,
  className,
}: AvatarProps) {
  return (
    <div className={cn("relative inline-block", className)}>
      <div
        className={cn(
          "rounded-full overflow-hidden bg-primary-container text-on-primary-container flex items-center justify-center font-bold shadow-sm",
          sizes[size],
          rings[ring],
        )}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={alt} className="w-full h-full object-cover" />
        ) : (
          <span>{initials ?? "?"}</span>
        )}
      </div>
      {status ? (
        <span
          className={cn(
            "absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-surface",
            statusColors[status],
          )}
        />
      ) : null}
    </div>
  );
}
