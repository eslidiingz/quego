import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { QuevaWordmark } from "@/components/ui/QuevaWordmark";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { requireCustomerSession } from "@/lib/auth/customer-session-server";
import { signOutCustomer } from "@/app/me/actions";
import { SignOutButton } from "./SignOutButton";
import { MeBottomNav } from "./MeBottomNav";
import { ME_NAV_ITEMS } from "./nav-items";

export const dynamic = "force-dynamic";

export default async function MeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Guard: redirects to /login when there's no valid customer session.
  await requireCustomerSession();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-30 bg-surface/95 backdrop-blur border-b border-outline-variant">
        <div className="max-w-5xl mx-auto w-full px-4 md:px-6 h-16 flex items-center justify-between gap-4">
          <Link
            href="/"
            aria-label="queva หน้าแรก"
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <QuevaWordmark />
          </Link>

          <div className="flex items-center gap-1 sm:gap-2">
            {/* Inline destinations live in the top bar on tablet/desktop only.
                On mobile they move to the fixed {@link MeBottomNav} so the
                narrow top bar stays uncluttered (app-style chrome). */}
            <nav className="hidden items-center gap-1 sm:flex">
              {ME_NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-full text-label-md font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors"
                >
                  <Icon name={item.icon} size={18} />
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>
            <ThemeToggle />
            <SignOutButton onSignOut={signOutCustomer} />
          </div>
        </div>
      </header>

      {/* pb clears the fixed bottom nav on mobile; it's hidden on sm:+. */}
      <main className="flex-1 pb-20 sm:pb-0">{children}</main>

      <MeBottomNav />
    </div>
  );
}
