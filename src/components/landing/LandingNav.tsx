import Link from "next/link";
import { SiteAuthLink } from "@/components/layout/SiteAuthLink";

const NAV_LINKS: { label: string; href: string }[] = [
  { label: "ค้นหาร้าน", href: "#shops" },
  { label: "วิธีใช้งาน", href: "#how" },
  { label: "สำหรับร้านค้า", href: "/shops/register" },
];

/**
 * queva top navigation — sticky, frosted, brand wordmark + section links and
 * the shared auth entry point.
 *
 * SRP: chrome + navigation only. Auth state lives entirely in SiteAuthLink
 * (DIP — this component never reads a session).
 */
export function LandingNav() {
  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between gap-4 px-4 md:px-12 py-3.5 bg-surface/85 backdrop-blur-md border-b border-outline-variant">
      <Link href="/" aria-label="queva หน้าแรก">
        <QuevaWordmark />
      </Link>

      <div className="hidden md:flex items-center gap-7 text-body-sm text-on-surface-variant">
        {NAV_LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="hover:text-primary transition-colors">
            {l.label}
          </Link>
        ))}
      </div>

      <SiteAuthLink />
    </nav>
  );
}

/** Brand wordmark: "queva" in teal with a coral full-stop. */
export function QuevaWordmark({ className }: { className?: string }) {
  return (
    <span
      className={`font-display font-semibold text-[26px] leading-none tracking-tight text-primary ${className ?? ""}`}
    >
      queva<span className="text-secondary">.</span>
    </span>
  );
}
