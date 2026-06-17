import { cn } from "@/lib/cn";

/**
 * Brand wordmark: "Quego" in teal with a coral full-stop.
 *
 * Standalone primitive with no app/session dependencies, so it can be rendered
 * from both server components (landing nav/footer) and client components (the
 * shop sidebar) without dragging server-only modules into a client bundle.
 *
 * `className` is merged last via `cn()`, so callers can override the default
 * size/color (e.g. `text-[34px] text-on-primary` on the dark login hero).
 */
export function QuegoWordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "font-display font-semibold text-[26px] leading-none tracking-tight text-primary",
        className,
      )}
    >
      Quego<span className="text-secondary">.</span>
    </span>
  );
}
