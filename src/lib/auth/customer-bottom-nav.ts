import "server-only";
import { getCustomerSession } from "./customer-session-server";
import { getShopSession } from "./shop-session-server";

/**
 * Whether the customer bottom tab bar should render on a **public** page.
 *
 * True only for a signed-in customer who is NOT also a shop owner — this
 * mirrors the precedence in {@link SiteAuthLink}: an owner browsing the public
 * site gets their "จัดการร้าน" shortcut, not the customer tabs. The two
 * sessions are independent httpOnly cookies, so checking shop first is what
 * distinguishes an owner who also happens to hold a customer session.
 *
 * Server-only: reads the session cookies. Callers use the result both to render
 * the bar ({@link CustomerBottomNav}) and to reserve the matching bottom inset
 * on the page so fixed page content clears it — keeping the two in lockstep.
 */
export async function shouldShowCustomerBottomNav(): Promise<boolean> {
  const [shopSession, customerSession] = await Promise.all([
    getShopSession(),
    getCustomerSession(),
  ]);
  return !shopSession && Boolean(customerSession);
}
