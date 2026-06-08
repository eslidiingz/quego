import { NextResponse, type NextRequest } from "next/server";
import { absoluteUrl } from "@/lib/url";
import {
  exchangeLineCodeForUserId,
  verifyLineOAuthStateToken,
  LINE_OAUTH_STATE_COOKIE,
  LINE_OAUTH_CALLBACK_PATH,
} from "@/lib/line/oauth";
import { linkCustomerLine } from "@/lib/services/line-linking";

/**
 * LINE Login OAuth callback for the customer connect flow. Verifies the CSRF
 * state (query param must equal the signed cookie, and the cookie must verify),
 * then exchanges the code for the LINE userId and binds it to the customer.
 * Always 302s back to the notifications tab with a ?notice= flash and clears the
 * state cookie. Node runtime; public (LINE reaches it) — trust comes from the
 * state. Mirrors the shop callback; only the persona + redirect target differ.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PROFILE_NOTIF = "/me/profile?tab=notifications";

function redirectClearingState(notice: string): NextResponse {
  const res = NextResponse.redirect(
    absoluteUrl(`${PROFILE_NOTIF}&notice=${notice}`),
  );
  res.cookies.delete(LINE_OAUTH_STATE_COOKIE.customer);
  return res;
}

export async function GET(request: NextRequest): Promise<Response> {
  const params = request.nextUrl.searchParams;

  // User declined consent, or LINE returned an error.
  if (params.get("error")) {
    return redirectClearingState("line-denied");
  }

  const code = params.get("code");
  const state = params.get("state");
  const cookieState = request.cookies.get(
    LINE_OAUTH_STATE_COOKIE.customer,
  )?.value;

  // CSRF: the state param must match the cookie AND the cookie must verify.
  if (!code || !state || !cookieState || state !== cookieState) {
    return redirectClearingState("line-error");
  }
  const verified = await verifyLineOAuthStateToken("customer", cookieState);
  if (!verified) {
    return redirectClearingState("line-error");
  }

  const exchanged = await exchangeLineCodeForUserId(
    code,
    absoluteUrl(LINE_OAUTH_CALLBACK_PATH.customer),
  );
  if (!exchanged.ok) {
    return redirectClearingState("line-error");
  }

  const linked = await linkCustomerLine(verified.subjectId, exchanged.userId);
  if (!linked.ok) {
    return redirectClearingState(
      linked.code === "already_linked"
        ? "line-already-linked-customer"
        : "line-error",
    );
  }

  return redirectClearingState("line-connected-customer");
}
