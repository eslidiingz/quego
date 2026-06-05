import * as React from "react";
import { cn } from "@/lib/cn";

/**
 * Presentational scaffolding for the living design-system page.
 *
 * These helpers carry NO hooks and import nothing server-only, so they compose
 * freely into both the server page (token galleries) and the client gallery
 * (live components). They render the *real* tokens via CSS custom properties
 * (`var(--color-…)`) rather than constructed Tailwind classes — Tailwind's JIT
 * can't see `bg-${name}`, but the `@theme` block emits every token as a real
 * CSS variable, so an inline `style` reflects the live value with zero drift.
 */

export function Section({
  id,
  eyebrow,
  title,
  description,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 space-y-5">
      <div className="space-y-1">
        <p className="text-label-sm uppercase tracking-widest text-secondary">
          {eyebrow}
        </p>
        <h2 className="font-display text-headline-lg text-on-background">{title}</h2>
        {description ? (
          <p className="max-w-prose text-body-sm text-on-surface-variant">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function Subsection({
  title,
  children,
  className,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="space-y-3">
      {title ? (
        <h3 className="text-label-lg text-on-surface">{title}</h3>
      ) : null}
      <div className={className}>{children}</div>
    </div>
  );
}

/** A bordered surface to frame a live component so it stands apart from the page. */
export function DemoCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-outline-variant bg-surface-container-lowest p-5",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Optional caption above a demo row. */
export function DemoLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-label-sm uppercase tracking-wider text-on-surface-variant">
      {children}
    </p>
  );
}

export type ColorToken = { name: string; hex: string; on?: boolean };

export function ColorSwatch({ name, hex, on }: ColorToken) {
  return (
    <div className="overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest">
      <div
        className="flex h-16 items-end justify-end p-2"
        style={{ backgroundColor: `var(--color-${name})` }}
      >
        {on ? (
          <span
            className="text-label-md font-semibold"
            style={{ color: `var(--color-on-${name})` }}
          >
            Aa
          </span>
        ) : null}
      </div>
      <div className="px-2.5 py-2">
        <p className="truncate text-label-md text-on-surface">{name}</p>
        <p className="text-label-sm uppercase text-on-surface-variant">{hex}</p>
      </div>
    </div>
  );
}

export function ColorGrid({ swatches }: { swatches: ColorToken[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
      {swatches.map((s) => (
        <ColorSwatch key={s.name} name={s.name} hex={s.hex} on={s.on} />
      ))}
    </div>
  );
}

/**
 * One typography row: the live specimen on the left (class applied so it shows
 * the real size/leading/weight) and its spec on the right.
 */
export function TypeSpecimen({
  className,
  token,
  spec,
  sample,
}: {
  className: string;
  token: string;
  spec: string;
  sample: string;
}) {
  return (
    <div className="flex flex-col gap-1 border-b border-outline-variant/60 py-3 last:border-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
      <p className={cn("min-w-0 truncate text-on-surface", className)}>{sample}</p>
      <div className="shrink-0 sm:text-right">
        <p className="text-label-md text-on-surface">{token}</p>
        <p className="text-label-sm text-on-surface-variant">{spec}</p>
      </div>
    </div>
  );
}

/** A labelled visual chip used by the spacing / radius / shadow galleries. */
export function TokenTile({
  label,
  meta,
  children,
}: {
  label: string;
  meta?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      {children}
      <div>
        <p className="text-label-md text-on-surface">{label}</p>
        {meta ? <p className="text-label-sm text-on-surface-variant">{meta}</p> : null}
      </div>
    </div>
  );
}
