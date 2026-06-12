"use client";

import { cn } from "@/lib/cn";
import { useWaitlistCount } from "./waitlist-count";

/**
 * Live count badge for the รอคิว nav tab. Renders the small error-coloured pill
 * with the number of waitlist entries that now have an open slot, or nothing
 * when there are none. The count + polling live in the shared
 * {@link useWaitlistCount} store, so the mobile-bar and desktop-bar instances
 * share one poll and always agree.
 *
 * SRP: presentation only. `className` lets each nav position the pill for its own
 * layout (overlay on the mobile icon vs. inline after the desktop label) without
 * this component knowing where it sits.
 */
export function WaitlistNavBadge({ className }: { className?: string }) {
  const count = useWaitlistCount();
  if (count <= 0) return null;

  return (
    <span
      aria-label={`มีคิวว่าง ${count} รายการ`}
      className={cn(
        "min-w-[18px] h-[18px] px-1 rounded-full bg-error text-on-error text-[10px] font-bold flex items-center justify-center",
        className,
      )}
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}
