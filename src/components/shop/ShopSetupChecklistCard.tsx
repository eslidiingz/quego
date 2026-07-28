import Link from "next/link";
import { Chip } from "@/components/ui/Chip";
import { Icon } from "@/components/ui/Icon";
import { buttonClassName } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { TOUR_ANCHORS } from "@/lib/tour/anchors";
import type { SetupChecklist, SetupTask } from "@/lib/shop/setup-checklist";

/**
 * The "เปิดร้านให้พร้อมรับจอง" activation card on the shop dashboard.
 *
 * Replaces the old single-step `ShopSetupNudge`: an owner who has just
 * registered needs to see the whole runway, not one step at a time, because
 * several of the steps (pin, photos) don't block bookings but do decide whether
 * anyone ever finds the shop.
 *
 * Disappears entirely once every step is done — a permanent 5/5 card is clutter.
 */
export function ShopSetupChecklistCard({
  checklist,
}: {
  checklist: SetupChecklist;
}) {
  if (checklist.complete) return null;

  return (
    <section
      data-tour={TOUR_ANCHORS.homeChecklist}
      aria-labelledby="setup-checklist-title"
      className="rounded-2xl border border-secondary/30 bg-secondary/5 p-4 sm:p-5"
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h2
          id="setup-checklist-title"
          className="text-body-md font-bold text-on-surface"
        >
          เปิดร้านให้พร้อมรับจอง
        </h2>
        <span className="text-label-md text-on-surface-variant tabular-nums">
          ทำแล้ว {checklist.doneCount}/{checklist.total}
        </span>
      </header>

      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={checklist.total}
        aria-valuenow={checklist.doneCount}
        aria-labelledby="setup-checklist-title"
        className="mt-3 h-2 overflow-hidden rounded-full bg-surface-container-high"
      >
        <div
          className="bg-progress-gradient h-full rounded-full transition-[width] duration-300 ease-out"
          style={{ width: `${Math.round(checklist.progress * 100)}%` }}
        />
      </div>

      <ul className="mt-4 flex flex-col gap-2.5">
        {checklist.tasks.map((task) => (
          <TaskRow key={task.key} task={task} />
        ))}
      </ul>
    </section>
  );
}

function TaskRow({ task }: { task: SetupTask }) {
  return (
    <li className="flex items-start gap-3">
      <span
        aria-hidden="true"
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full",
          task.done
            ? "bg-success/15 text-success"
            : "bg-secondary/15 text-secondary",
        )}
      >
        <Icon name={task.done ? "check_circle" : task.icon} size={18} />
      </span>

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "flex flex-wrap items-center gap-2 text-label-lg",
            task.done
              ? "text-on-surface-variant line-through"
              : "text-on-surface",
          )}
        >
          {task.title}
          {task.blocking && !task.done ? (
            <Chip variant="waiting" size="sm">
              จำเป็น
            </Chip>
          ) : null}
        </p>
        {task.done ? null : (
          <p className="mt-0.5 text-label-md text-on-surface-variant">
            {task.description}
          </p>
        )}
      </div>

      {task.done ? null : (
        <Link
          href={task.ctaHref}
          className={buttonClassName({
            variant: "ghost",
            size: "sm",
            className: "shrink-0",
          })}
        >
          {task.ctaLabel}
        </Link>
      )}
    </li>
  );
}
