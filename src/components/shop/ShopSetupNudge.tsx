import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { buttonClassName } from "@/components/ui/Button";

/**
 * First-run setup nudge for the shop dashboard: a soft "attention" card with a
 * leading icon, a title + description, and a single primary call-to-action that
 * takes the owner straight to the screen they still need to configure (services
 * first, then business hours).
 *
 * SRP / DIP: presentation only. It takes the few primitives it renders and owns
 * no data access or step logic — the dashboard (route layer) decides *which*
 * step to surface and passes the copy + href down. That keeps the same shell
 * reusable for every onboarding step (Rule 9: one card, many steps).
 */
export function ShopSetupNudge({
  icon,
  title,
  description,
  ctaLabel,
  ctaHref,
}: {
  icon: string;
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
}) {
  return (
    <div
      role="status"
      className="flex flex-col gap-3 rounded-2xl border border-secondary/30 bg-secondary/5 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary/15 text-secondary">
          <Icon name={icon} size={22} />
        </span>
        <div className="min-w-0">
          <p className="text-body-md font-bold text-on-surface">{title}</p>
          <p className="mt-0.5 text-label-md text-on-surface-variant">
            {description}
          </p>
        </div>
      </div>
      <Link
        href={ctaHref}
        className={buttonClassName({
          variant: "primary",
          size: "md",
          className: "w-full shrink-0 sm:w-auto",
        })}
      >
        {ctaLabel}
        <Icon name="arrow_forward" size={18} />
      </Link>
    </div>
  );
}
