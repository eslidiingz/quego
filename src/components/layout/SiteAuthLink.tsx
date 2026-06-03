import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { getCustomerSession } from "@/lib/auth/customer-session-server";

/**
 * Auth-aware nav link for the public site chrome. Reads the customer session
 * server-side: signed-in customers get a shortcut to their queue area,
 * everyone else gets the login entry point.
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
  const session = await getCustomerSession();
  const signedIn = Boolean(session);

  const href = signedIn ? "/me/bookings" : "/login";
  const label = signedIn ? "คิวของฉัน" : "เข้าสู่ระบบ";

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
      {signedIn ? <Icon name="confirmation_number" size={16} /> : null}
      {label}
      {signedIn ? null : <Icon name="chevron_right" size={16} />}
    </Link>
  );
}
