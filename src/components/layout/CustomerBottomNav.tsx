"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { ME_NAV_ITEMS } from "@/app/me/nav-items";

/**
 * Native-app-style bottom tab bar for the signed-in customer. Shown only on
 * mobile (`sm:hidden`); on tablet/desktop the same destinations live in the
 * top bar (see {@link MeLayout}). Fixed to the viewport bottom with an iOS
 * safe-area inset so it clears the home indicator.
 *
 * Used in two places, always for an authenticated customer:
 * - The customer area layout ({@link MeLayout}) renders it unconditionally —
 *   that subtree is already session-guarded.
 * - Public pages render it gated behind {@link shouldShowCustomerBottomNav} so
 *   a logged-in customer keeps app-style navigation while browsing the site.
 *
 * SRP: render + highlight the primary nav. The destination list is injected
 * from the shared {@link ME_NAV_ITEMS} so it can't drift from the desktop nav;
 * the authentication decision lives entirely in the callers (DIP).
 */
export function CustomerBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="เมนูหลัก"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-outline-variant bg-surface/95 backdrop-blur pb-[env(safe-area-inset-bottom)] sm:hidden"
    >
      <ul className="mx-auto grid max-w-5xl grid-cols-4">
        {ME_NAV_ITEMS.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-16 flex-col items-center justify-center gap-1 px-1 py-2 transition-colors",
                  active
                    ? "text-primary"
                    : "text-on-surface-variant hover:text-on-surface",
                )}
              >
                <Icon name={item.icon} size={24} filled={active} />
                <span
                  className={cn(
                    "text-label-sm leading-none",
                    active && "font-semibold",
                  )}
                >
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
