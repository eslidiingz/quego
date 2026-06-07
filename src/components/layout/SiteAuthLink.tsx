import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { getCustomerSession } from "@/lib/auth/customer-session-server";
import { getShopSession } from "@/lib/auth/shop-session-server";

/**
 * Auth-aware nav link for the public site chrome. Reads the active session
 * server-side and renders the right entry point:
 *
 * - **Shop owner** signed in → shortcut back to their dashboard (`/shop`).
 * - **Customer** signed in → shortcut to their queue area (`/me/bookings`).
 * - **Nobody** → the login entry point.
 *
 * Shop takes precedence over customer: an owner browsing the public pages
 * should be routed back to their own management area. The two are independent
 * httpOnly cookies, so checking shop first is the only thing distinguishing
 * an owner who also happens to hold a customer session.
 *
 * SRP: render the right entry point for the current session — nothing else.
 * Shared across every public page header (and the home footer) so the
 * logged-in/out state can never drift between them.
 *
 * OCP: `variant` selects presentation (header = pill with icon, footer = plain
 * text) without the component knowing about any specific page.
 */
export async function SiteAuthLink({
  variant = "header",
}: {
  variant?: "header" | "footer";
}) {
  const [shopSession, customerSession] = await Promise.all([
    getShopSession(),
    getCustomerSession(),
  ]);

  let href = "/login";
  let label = "เข้าสู่ระบบ";
  let icon: string | null = null;

  if (shopSession) {
    href = "/shop";
    label = "จัดการร้าน";
    icon = "storefront";
  } else if (customerSession) {
    href = "/me/bookings";
    label = "คิวของฉัน";
    icon = "confirmation_number";
  }

  if (variant === "footer") {
    return (
      <Link href={href} className="hover:text-primary transition-colors">
        {label}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className="text-label-md text-primary font-semibold inline-flex items-center gap-1"
    >
      {icon ? <Icon name={icon} size={16} /> : null}
      {label}
      {icon ? null : <Icon name="chevron_right" size={16} />}
    </Link>
  );
}
