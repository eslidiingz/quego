import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

type AuthHeroShellProps = {
  /** Material symbol rendered inside the gradient logo tile. When omitted, the
   *  tile is not rendered and the title (the Quego wordmark) stands alone. */
  icon?: string;
  /** Accessible label for the logo tile link (defaults to "Quego หน้าแรก"
   *  so it reads distinctly from the textual back link). */
  iconLabel?: string;
  /** Optional uppercase pill above the title — persona / context cue. */
  eyebrow?: ReactNode;
  /** Main heading slot — the Quego wordmark or a step title. */
  title: ReactNode;
  /** Supporting line under the title. */
  subtitle: ReactNode;
  /** Card body (tabs, forms, …) — rendered inside the white panel. */
  children: ReactNode;
  /** Optional line under the card (copyright, "wrong number?" link, …). */
  footer?: ReactNode;
};

/**
 * The shared "luxury" auth screen chrome: the Quego teal-and-gold hero
 * background, decorative concentric rings, a gradient logo tile, the
 * centered title block, and the white card that holds the form.
 *
 * SRP: this owns the persona-agnostic visual shell only. Every auth screen
 * (admin login, unified customer/shop login, the PIN steps) passes its own
 * icon, copy, and card body in — so the chrome can never drift between them.
 */
export function AuthHeroShell({
  icon,
  iconLabel = "Quego หน้าแรก",
  eyebrow,
  title,
  subtitle,
  children,
  footer,
}: AuthHeroShellProps) {
  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-quego-hero text-on-primary flex flex-col px-4 py-6 md:py-10">
      {/* Decorative concentric rings + soft glow — the Quego hero signature */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-40 -top-32 size-[520px] rounded-full border border-on-primary/10"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-10 size-[320px] rounded-full border border-on-primary/10"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-44 -bottom-44 size-[500px] rounded-full border border-on-primary/10"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 size-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-fixed-dim/[0.06] blur-3xl"
      />

      {/* Theme switch — top-right over the hero. on-primary colours keep it
          legible on the teal gradient (which stays dark in both themes). */}
      <div className="absolute right-4 top-4 z-20 md:right-6">
        <ThemeToggle className="text-on-primary/90 hover:bg-on-primary/15 hover:text-on-primary focus-visible:ring-on-primary focus-visible:ring-offset-primary-container" />
      </div>

      <div className="relative z-10 w-full max-w-md mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-label-md text-on-primary/90 hover:text-on-primary transition-colors mb-6 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-primary focus-visible:ring-offset-2 focus-visible:ring-offset-primary-container"
        >
          <Icon name="arrow_back" size={18} />
          กลับหน้าหลัก
        </Link>
      </div>

      <div className="relative z-10 w-full max-w-md mx-auto flex-1 flex flex-col justify-center pb-8">
        <div className="quego-reveal flex flex-col items-center text-center mb-8">
          {icon ? (
            <Link
              href="/"
              aria-label={iconLabel}
              className="rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-primary focus-visible:ring-offset-2 focus-visible:ring-offset-primary-container"
            >
              <div className="w-16 h-16 rounded-2xl bg-luxury-gradient flex items-center justify-center mb-5 shadow-luxury ring-1 ring-on-primary/25 hover:scale-105 transition-transform duration-200 ease-out">
                <Icon name={icon} className="text-on-primary" size={32} />
              </div>
            </Link>
          ) : null}
          {eyebrow ? (
            <span className="inline-flex items-center gap-2 font-display text-label-sm font-medium uppercase tracking-wide text-primary-fixed-dim bg-primary-container/70 border border-primary-fixed-dim/40 px-3.5 py-1.5 rounded-full mb-4">
              {eyebrow}
            </span>
          ) : null}
          {title}
          <p className="text-body-md text-on-primary/90 mt-3 break-words">{subtitle}</p>
        </div>

        <div className="quego-reveal bg-surface text-on-surface rounded-3xl shadow-luxury ring-1 ring-outline-variant/70 p-6 md:p-8">
          {children}
        </div>

        {footer ? (
          <p className="quego-reveal text-label-sm text-on-primary/90 text-center mt-6">
            {footer}
          </p>
        ) : null}
      </div>
    </main>
  );
}
