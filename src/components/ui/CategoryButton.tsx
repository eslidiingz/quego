import * as React from "react";
import { cn } from "@/lib/cn";

export type CategoryButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  icon: React.ReactNode;
  active?: boolean;
};

export function CategoryButton({
  label,
  icon,
  active,
  className,
  ...rest
}: CategoryButtonProps) {
  return (
    <button
      className={cn(
        "flex flex-col items-center gap-2 group transition-transform active:scale-95",
        className,
      )}
      {...rest}
    >
      <span
        className={cn(
          "w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow",
          active
            ? "bg-secondary-container text-on-secondary-container"
            : "bg-surface-container-highest text-on-surface-variant",
        )}
      >
        <span className="[&>span]:text-3xl">{icon}</span>
      </span>
      <span className="text-label-md text-on-surface">{label}</span>
    </button>
  );
}
