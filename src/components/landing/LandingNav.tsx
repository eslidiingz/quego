import Link from "next/link";
import { SiteAuthLink } from "@/components/layout/SiteAuthLink";
import { buttonClassName } from "@/components/ui/Button";
import { QuegoWordmark } from "@/components/ui/QuegoWordmark";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

/** Section anchors — desktop-only, low-emphasis text links. */
const ANCHOR_LINKS: { label: string; href: string }[] = [
  { label: "ค้นหาร้าน", href: "#shops" },
  { label: "วิธีใช้งาน", href: "#how" },
];

/**
 * Quego top navigation — sticky, frosted, brand wordmark + section links and
 * the shared auth entry point.
 *
 * The "สำหรับร้าน" entry is promoted out of the anchor list into a ghost button
 * so it (a) reads as a distinct, higher-emphasis action than the section links
 * and (b) stays visible on mobile, where the anchor links collapse.
 *
 * SRP: chrome + navigation only. Auth state lives entirely in SiteAuthLink
 * (DIP — this component never reads a session).
 */
export function LandingNav() {
  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between gap-3 px-4 md:px-12 py-3.5 bg-surface/85 backdrop-blur-md border-b border-outline-variant">
      <Link href="/" aria-label="Quego หน้าแรก">
        <QuegoWordmark />
      </Link>

      <div className="hidden md:flex items-center gap-7 text-body-sm text-on-surface-variant">
        {ANCHOR_LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="hover:text-primary transition-colors duration-200">
            {l.label}
          </Link>
        ))}
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        <Link href="/shops/register" className={buttonClassName({ variant: "ghost", size: "sm" })}>
          สำหรับร้าน
        </Link>
        <ThemeToggle />
        <SiteAuthLink />
      </div>
    </nav>
  );
}
