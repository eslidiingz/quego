import Link from "next/link";
import { QuegoWordmark } from "@/components/ui/QuegoWordmark";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { SiteAuthLink } from "@/components/layout/SiteAuthLink";

/**
 * Shared brand chrome for public, non-landing pages (shop detail, booking
 * flow, booking confirmation). Mirrors {@link LandingNav}'s frosted sticky bar
 * — same wordmark, theme toggle, and auth entry point — so branding stays
 * consistent across the whole public surface.
 *
 * SRP: render the top bar. Auth state lives entirely in {@link SiteAuthLink}
 * (DIP — this component never reads a session).
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 bg-surface/95 backdrop-blur border-b border-outline-variant">
      <div className="max-w-[1280px] mx-auto px-4 md:px-12 h-16 flex items-center justify-between">
        <Link href="/" aria-label="quego หน้าแรก" className="flex items-center gap-2">
          <QuegoWordmark />
        </Link>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <SiteAuthLink />
        </div>
      </div>
    </header>
  );
}
