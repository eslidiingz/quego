import { NextResponse } from "next/server";
import { getShopSession } from "@/lib/auth/shop-session-server";
import { absoluteUrl } from "@/lib/url";
import { getLineLoginChannelId } from "@/lib/line/config";
import {
  buildLineAuthorizeUrl,
  signLineOAuthStateToken,
  LINE_OAUTH_STATE_COOKIE,
  LINE_OAUTH_STATE_TTL_SECONDS,
  LINE_OAUTH_CALLBACK_PATH,
} from "@/lib/line/oauth";

/**
 * Start the shop LINE-connect OAuth flow. The "เชื่อมต่อ LINE" button links here
 * (GET). We mint a signed state token (carrying the shop id), drop it in an
 * httpOnly cookie, and 302 to LINE's authorize page with the same token as the
 * `state` param — the callback later requires param === cookie (CSRF).
 *
 * Node runtime (jose) + never cached. NOT matched by src/proxy.ts (it guards
 * /shop, not /api/shop), so we check the session ourselves.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PROFILE_NOTIF = "/shop/profile?tab=notifications";

export async function GET(): Promise<Response> {
  const session = await getShopSession();
  if (!session) {
    return NextResponse.redirect(absoluteUrl("/login?tab=shop"));
  }

  let authorizeUrl: string;
  let stateToken: string;
  try {
    const clientId = getLineLoginChannelId();
    stateToken = await signLineOAuthStateToken(session.shopId);
    authorizeUrl = buildLineAuthorizeUrl({
      clientId,
      state: stateToken,
      redirectUri: absoluteUrl(LINE_OAUTH_CALLBACK_PATH),
    });
  } catch (err) {
    console.error("LINE shop connect misconfigured:", err);
    return NextResponse.redirect(
      absoluteUrl(`${PROFILE_NOTIF}&notice=line-unconfigured`),
    );
  }

  const res = NextResponse.redirect(authorizeUrl);
  res.cookies.set(LINE_OAUTH_STATE_COOKIE, stateToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: LINE_OAUTH_STATE_TTL_SECONDS,
  });
  return res;
}
