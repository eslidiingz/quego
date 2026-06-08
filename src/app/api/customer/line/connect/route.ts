import { NextResponse } from "next/server";
import { getCustomerSession } from "@/lib/auth/customer-session-server";
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
 * Start the customer LINE-connect OAuth flow. The "เชื่อมต่อ LINE" button links
 * here (GET). We mint a signed state token (carrying the customer id), drop it in
 * an httpOnly cookie, and 302 to LINE's authorize page with the same token as the
 * `state` param — the callback later requires param === cookie (CSRF). Mirrors
 * the shop connect route; only the persona + redirect target differ.
 *
 * Node runtime (jose) + never cached. NOT matched by src/proxy.ts (it guards
 * /me, not /api/customer), so we check the session ourselves.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PROFILE_NOTIF = "/me/profile?tab=notifications";

export async function GET(): Promise<Response> {
  const session = await getCustomerSession();
  if (!session) {
    return NextResponse.redirect(absoluteUrl("/login"));
  }

  let authorizeUrl: string;
  let stateToken: string;
  try {
    const clientId = getLineLoginChannelId();
    stateToken = await signLineOAuthStateToken("customer", session.customerId);
    authorizeUrl = buildLineAuthorizeUrl({
      clientId,
      state: stateToken,
      redirectUri: absoluteUrl(LINE_OAUTH_CALLBACK_PATH.customer),
    });
  } catch (err) {
    console.error("LINE customer connect misconfigured:", err);
    return NextResponse.redirect(
      absoluteUrl(`${PROFILE_NOTIF}&notice=line-unconfigured`),
    );
  }

  const res = NextResponse.redirect(authorizeUrl);
  res.cookies.set(LINE_OAUTH_STATE_COOKIE.customer, stateToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: LINE_OAUTH_STATE_TTL_SECONDS,
  });
  return res;
}
