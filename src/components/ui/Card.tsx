import * as React from "react";
import { cn } from "@/lib/cn";

type Elevation = "flat" | "low" | "medium" | "high";

const elevations: Record<Elevation, string> = {
  flat: "border border-outline-variant",
  low: "border border-outline-variant shadow-sm",
  medium: "shadow-tinted",
  high: "shadow-luxury",
};

export type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  elevation?: Elevation;
  padded?: boolean;
  asGlass?: boolean;
};

export function Card({
  elevation = "low",
  padded = true,
  asGlass = false,
  className,
  ...rest
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl",
        asGlass ? "glass-card" : "bg-surface-container-lowest",
        padded && "p-6",
        elevations[elevation],
        className,
      )}
      {...rest}
    />
  );
}

export function CardHeader({
  className,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex items-center gap-3 pb-4 border-b border-outline-variant/40", className)}
      {...rest}
    />
  );
}

export function CardTitle({
  className,
  ...rest
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("font-display text-headline-md text-on-surface", className)}
      {...rest}
    />
  );
}

export function CardBody({
  className,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("pt-4", className)} {...rest} />;
}
