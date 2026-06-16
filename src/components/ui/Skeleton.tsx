import { QuegoWordmark } from "@/components/ui/QuegoWordmark";
import { cn } from "@/lib/cn";

/**
 * Loading-state primitives for route-segment `loading.tsx` fallbacks (shown
 * instantly on navigation while an async page streams in — see Next's
 * `loading.js` Suspense convention).
 *
 * SRP: each export renders one placeholder shape. They compose from {@link
 * Skeleton}, the single source of the pulse treatment, so the animation +
 * surface colour stay consistent everywhere. Pure presentational — no data,
 * no client state — so they render as Server Components inside `loading.tsx`.
 */

/** A single pulsing placeholder block. Size/shape via `className`. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "animate-pulse motion-reduce:animate-none rounded-md bg-surface-container-high",
        className,
      )}
    />
  );
}

/** Mirrors {@link PageHeader}: eyebrow + title + description (+ optional action). */
export function PageHeaderSkeleton({ withAction = false }: { withAction?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1 space-y-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-56 max-w-full" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      {withAction && <Skeleton className="h-11 w-32 shrink-0 rounded-full" />}
    </div>
  );
}

/** A stack of card-shaped rows — for list/feed pages (bookings, shops, …). */
export function CardListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-24 w-full rounded-xl" />
      ))}
    </div>
  );
}

/**
 * Full-viewport branded fallback for pages whose chrome isn't a persistent
 * layout (public home, shop detail, booking confirmation). A spinning teal
 * ring under the wordmark so the swap reads as "loading", not a broken page.
 */
export function FullPageSpinner() {
  return (
    <div
      role="status"
      aria-label="กำลังโหลด"
      className="flex min-h-[70vh] flex-col items-center justify-center gap-6"
    >
      <QuegoWordmark className="text-[28px] opacity-90" />
      <span
        aria-hidden="true"
        className="size-8 animate-spin motion-reduce:animate-none rounded-full border-[3px] border-outline-variant border-t-primary"
      />
    </div>
  );
}
