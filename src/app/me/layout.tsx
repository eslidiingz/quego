import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { requireCustomerSession } from "@/lib/auth/customer-session-server";
import { signOutCustomer } from "@/app/me/actions";
import { SignOutButton } from "./SignOutButton";

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
            className="flex items-center gap-2 text-primary hover:opacity-80 transition-opacity"
          >
            <Icon name="spa" size={28} />
            <span className="font-display font-bold text-headline-md tracking-tight">
              LuxeQueue
            </span>
          </Link>

          <div className="flex items-center gap-1 sm:gap-2">
            <nav className="flex items-center gap-1">
              <Link
                href="/me/bookings"
                className="flex items-center gap-1.5 px-3 py-2 rounded-full text-label-md font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors"
              >
                <Icon name="confirmation_number" size={18} />
                <span className="hidden sm:inline">คิวของฉัน</span>
              </Link>
              <Link
                href="/me/profile"
                className="flex items-center gap-1.5 px-3 py-2 rounded-full text-label-md font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors"
              >
                <Icon name="person" size={18} />
                <span className="hidden sm:inline">โปรไฟล์</span>
              </Link>
            </nav>
            <SignOutButton onSignOut={signOutCustomer} />
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}
