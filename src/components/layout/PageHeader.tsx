import * as React from "react";

/**
 * Standard page header shared across the shop area (and reusable by other
 * personas): an uppercase eyebrow, the page's single display `<h1>`, an
 * optional badge beside the title, an optional inline action on the right
 * (a primary Button / dialog trigger), and an optional description below.
 *
 * One source of truth for header layout so every screen lines up — title and
 * action share a row (`items-center justify-between`); the title may wrap on
 * narrow viewports while the action stays pinned right (`shrink-0`). Per the
 * project convention, actions are pill `Button`s.
 */
export function PageHeader({
  eyebrow,
  title,
  badge,
  action,
  description,
}: {
  eyebrow: string;
  title: React.ReactNode;
  badge?: React.ReactNode;
  action?: React.ReactNode;
  description?: React.ReactNode;
}) {
  return (
    <header>
      <p className="text-label-md text-secondary uppercase tracking-widest mb-1">
        {eyebrow}
      </p>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap min-w-0">
          <h1 className="font-display text-headline-lg text-on-background">
            {title}
          </h1>
          {badge}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {description ? (
        <p className="text-on-surface-variant mt-2">{description}</p>
      ) : null}
    </header>
  );
}
