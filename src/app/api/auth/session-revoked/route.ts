import { NextResponse, type NextRequest } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  CUSTOMER_SESSION_COOKIE,
  SHOP_SESSION_COOKIE,
} from "@/lib/auth/session";

/**
 * Landing spot for a session whose JWT is still valid but whose
 * `session_version` is behind the DB (audit M7 — PIN/password changed
 * elsewhere). Server Components can't delete cookies, and proxy.ts only checks
 * the JWT, so without this the login page would bounce the stale cookie back
 * into the area that just rejected it (a redirect loop). This handler clears the
 * persona's cookie, then sends the visitor to the right login page.
 *
 * Not covered by proxy.ts (its matcher skips /api). The target is fixed per
 * persona — never taken from the query string — so it can't be an open redirect.
 */
const PERSONAS = {
  admin: { cookie: ADMIN_SESSION_COOKIE, login: "/admin/login" },
  shop: { cookie: SHOP_SESSION_COOKIE, login: "/login?tab=shop&notice=session-expired" },
  customer: { cookie: CUSTOMER_SESSION_COOKIE, login: "/login?notice=session-expired" },
} as const;

export const dynamic = "force-dynamic";

export function GET(request: NextRequest): NextResponse {
  const raw = request.nextUrl.searchParams.get("p");
  const persona =
    raw === "admin" || raw === "shop" || raw === "customer" ? raw : "customer";
  const { cookie, login } = PERSONAS[persona];
  const res = NextResponse.redirect(new URL(login, request.url));
  res.cookies.delete(cookie);
  return res;
}
