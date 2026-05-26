import { NextResponse, type NextRequest } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  SHOP_SESSION_COOKIE,
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
  // The login flow itself is public: phone entry and PIN entry both live
  // under /shop/login/... and must remain reachable without a session.
  const isLoginRoute =
    pathname === "/shop/login" || pathname.startsWith("/shop/login/");

  const token = request.cookies.get(SHOP_SESSION_COOKIE)?.value;
  const session = token ? await verifyShopSessionToken(token) : null;

  if (session && isLoginRoute) {
    return NextResponse.redirect(new URL("/shop", request.url));
  }

  if (!session && !isLoginRoute) {
    const loginUrl = new URL("/shop/login", request.url);
    if (pathname !== "/shop") {
      loginUrl.searchParams.set("next", pathname + search);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*", "/shop", "/shop/:path*"],
};
