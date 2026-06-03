import { Icon } from "./Icon";

/**
 * Card-with-header grouping for a settings/profile form's fields. The submit
 * button is intentionally NOT part of this — callers render it as a sibling
 * AFTER the FormSection so it sits *outside* the card, matching the shop
 * profile forms.
 *
 * SRP: visual grouping only. Shared so every profile form (customer + shop)
 * frames its fields identically. (Replaces the per-file local `Section`
 * copies that previously drifted.)
 */
export function FormSection({
  icon,
  title,
  description,
  children,
}: {
  icon: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm p-6 md:p-8 space-y-4">
      <header className="flex items-start gap-3 pb-4 border-b border-outline-variant/40">
        <span className="w-10 h-10 rounded-lg bg-primary-container/10 text-primary flex items-center justify-center shrink-0">
          <Icon name={icon} />
        </span>
        <div>
          <h2 className="font-display text-headline-md text-on-surface">{title}</h2>
          {description ? (
            <p className="text-label-md text-on-surface-variant mt-1">
              {description}
            </p>
          ) : null}
        </div>
      </header>
      <div className="space-y-4 pt-2">{children}</div>
    </section>
  );
}
