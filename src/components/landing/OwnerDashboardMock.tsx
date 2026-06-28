import { cn } from "@/lib/cn";

/**
 * Decorative marketing mock of the shop's "วันนี้" dashboard glance — a couple
 * of stat tiles + a queue row on the branded teal panel. Decorative only
 * (`aria-hidden`). Shared by the `/business` shop-landing hero; pass a
 * `className` (e.g. `hidden lg:block`) to control where it shows.
 */
export function OwnerDashboardMock({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "relative justify-self-center lg:justify-self-end w-full max-w-[460px]",
        className,
      )}
    >
      <div className="rounded-xl bg-quego-panel text-on-primary p-6 shadow-luxury">
        <div className="flex items-center justify-between">
          <span className="text-label-md font-medium text-on-primary/80">
            ภาพรวมวันนี้
          </span>
          <span className="inline-flex items-center gap-1.5 text-label-sm text-on-primary/80">
            <span className="relative flex size-2">
              <span className="animate-queue-pulse absolute inline-flex size-full rounded-full bg-tertiary-fixed-dim/50" />
              <span className="relative inline-flex size-2 rounded-full bg-tertiary-fixed-dim" />
            </span>
            อัปเดตสด
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-on-primary/10 p-4">
            <span className="block font-display font-bold text-[28px] leading-none">
              12
            </span>
            <span className="block text-label-md text-on-primary/75 mt-1.5">
              คิววันนี้
            </span>
          </div>
          <div className="rounded-lg bg-on-primary/10 p-4">
            <span className="block font-display font-bold text-[28px] leading-none">
              8
            </span>
            <span className="block text-label-md text-on-primary/75 mt-1.5">
              ที่ว่างเหลือ
            </span>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-3 rounded-lg bg-on-primary/10 p-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-tertiary-fixed-dim/20 text-tertiary-fixed-dim font-display font-bold text-label-lg">
            3
          </span>
          <div className="min-w-0">
            <p className="truncate text-label-lg font-semibold text-on-primary">
              คิวถัดไป · คุณมานี
            </p>
            <p className="text-label-md text-on-primary/70">
              ทำเล็บเจล · 13:30 น.
            </p>
          </div>
          <span className="ml-auto inline-flex items-center rounded-full bg-secondary px-3 py-1 text-label-sm font-semibold uppercase tracking-wider text-on-secondary">
            เรียกคิว
          </span>
        </div>
      </div>
    </div>
  );
}
