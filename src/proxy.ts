import { NextResponse, type NextRequest } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  CUSTOMER_SESSION_COOKIE,
  SHOP_SESSION_COOKIE,
  verifyCustomerSessionToken,
  verifySessionToken,
  verifyShopSessionToken,
} from "@/lib/auth/session";

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return handleAdminRoute(request, pathname, search);
  }

  // `/shop` and `/shop/...` — owner area. NB: `/shops/*` (plural) is the
  // public registration namespace and is NOT covered here.
  if (pathname === "/shop" || pathname.startsWith("/shop/")) {
    return handleShopRoute(request, pathname, search);
  }

  // `/me` and `/me/*` — authenticated customer area. Requires a customer
  // session (anonymous bookings still work without ever touching this).
  if (pathname === "/me" || pathname.startsWith("/me/")) {
    return handleCustomerArea(request, pathname, search);
  }

  // `/login` — unified login. If the visitor already has a customer or
  // shop session, send them to their respective area so the login page
  // doesn't sit on top of an active session.
  if (pathname === "/login" || pathname.startsWith("/login/")) {
    return handleLoginRoute(request);
  }

  return NextResponse.next();
}

async function handleAdminRoute(
  request: NextRequest,
  pathname: string,
  search: string,
) {
  const isLoginRoute = pathname === "/admin/login";
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (session && isLoginRoute) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  if (!session && !isLoginRoute) {
    const loginUrl = new URL("/admin/login", request.url);
    if (pathname !== "/admin") {
      loginUrl.searchParams.set("next", pathname + search);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

async function handleShopRoute(
  request: NextRequest,
  pathname: string,
  search: string,
) {
  // Shop login is unified under /login (shop tab). The standalone
  // /shop/login is now just a redirect there, and the PIN step still lives
  // at /shop/login/pin — both must stay reachable without a session.
  const isLoginRoute =
    pathname === "/shop/login" || pathname.startsWith("/shop/login/");

  const token = request.cookies.get(SHOP_SESSION_COOKIE)?.value;
  const session = token ? await verifyShopSessionToken(token) : null;

  if (session && isLoginRoute) {
    return NextResponse.redirect(new URL("/shop", request.url));
  }

  if (!session && !isLoginRoute) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("tab", "shop");
    if (pathname !== "/shop") {
      loginUrl.searchParams.set("next", pathname + search);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

async function handleCustomerArea(
  request: NextRequest,
  pathname: string,
  search: string,
) {
  const token = request.cookies.get(CUSTOMER_SESSION_COOKIE)?.value;
  const session = token ? await verifyCustomerSessionToken(token) : null;

  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname + search);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

async function handleLoginRoute(request: NextRequest) {
  // /login is shared between the customer-step-1 and shop-step-1 flows.
  // If a session of either type is already valid, route the visitor to
  // the area that session controls instead of asking them to log in again.
  const customerToken = request.cookies.get(CUSTOMER_SESSION_COOKIE)?.value;
  const customer = customerToken
    ? await verifyCustomerSessionToken(customerToken)
    : null;
  if (customer) {
    return NextResponse.redirect(new URL("/me/bookings", request.url));
  }

  const shopToken = request.cookies.get(SHOP_SESSION_COOKIE)?.value;
  const shop = shopToken ? await verifyShopSessionToken(shopToken) : null;
  if (shop) {
    return NextResponse.redirect(new URL("/shop", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin",
    "/admin/:path*",
    "/shop",
    "/shop/:path*",
    "/me",
    "/me/:path*",
    "/login",
    "/login/:path*",
  ],
};
