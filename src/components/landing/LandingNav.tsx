import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { SiteAuthLink } from "@/components/layout/SiteAuthLink";
import { QuegoWordmark } from "@/components/ui/QuegoWordmark";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

/** Section anchors — desktop-only, low-emphasis text links. */
const ANCHOR_LINKS: { label: string; href: string }[] = [
  { label: "ค้นหาร้าน", href: "/#shops" },
  { label: "วิธีใช้งาน", href: "/#how" },
];

/**
 * Quego top navigation — sticky, frosted, brand wordmark + section links and
 * the shared auth entry point.
 *
 * SRP: chrome + navigation only. Auth state lives entirely in SiteAuthLink
 * (DIP — this component never reads a session). The "เปิดร้าน" link is the one
 * supply-side affordance: a low-emphasis route to the /business landing, shown
 * on every breakpoint so a shop owner always has a way in.
 */
export function LandingNav() {
  return (
    <nav className="sticky top-0 z-50 px-4 md:px-12 py-3.5 bg-surface/85 backdrop-blur-md border-b border-outline-variant">
      {/* Inner container matches the page content width (max-w-[1180px]) so the
          wordmark aligns with the hero/section left edge instead of floating out
          to the viewport edge on wide screens. */}
      <div className="mx-auto flex w-full max-w-[1180px] items-center justify-between gap-3">
        {/* Brand + primary links grouped on the left so the nav reads as one
            unit instead of floating links pinned to the centre. */}
        <div className="flex items-center gap-8">
        <Link href="/" aria-label="Quego หน้าแรก">
          <QuegoWordmark />
        </Link>
        <div className="hidden md:flex items-center gap-6 text-body-sm text-on-surface-variant">
          {ANCHOR_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-primary transition-colors duration-200">
              {l.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Actions, right-aligned. A divider separates the supply-side CTA
          (เปิดร้าน) from the personal-account utilities so the two intents
          don't read as one undifferentiated row. */}
      <div className="flex items-center gap-2 sm:gap-3">
        <Link
          href="/business"
          className="inline-flex items-center gap-1 rounded-full px-2.5 sm:px-3 py-1.5 text-label-md font-semibold text-primary hover:bg-surface-container-low transition-colors"
        >
          <Icon name="storefront" size={16} className="hidden sm:inline-block" />
          เปิดร้าน
        </Link>
        <span aria-hidden className="hidden sm:block h-5 w-px bg-outline-variant" />
        <div className="flex items-center gap-1 sm:gap-2">
          <ThemeToggle />
          <SiteAuthLink />
        </div>
      </div>
      </div>
    </nav>
  );
}
