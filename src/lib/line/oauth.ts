import "server-only";
import { randomUUID } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { getLineLoginChannelId, getLineLoginChannelSecret } from "./config";

/**
 * LINE Login (OAuth 2.1) connect flow, shared by both personas (shop owner and
 * customer). SRP: speak the LINE Login HTTP + mint/verify the CSRF state token —
 * nothing about who is connecting, cookies, or routing (the route handlers own
 * those). The userId it resolves is bound to a shop by linkShopLine() or to a
 * customer by linkCustomerLine().
 *
 * Why OAuth (vs. a copy-the-code deep link): the user taps a button and
 * authorizes in LINE, no code to copy. `bot_prompt=aggressive` makes LINE offer
 * "add the OA as friend" during login — required, because the Messaging API can
 * only push to a friend. The login userId equals the Messaging userId only when
 * the Login channel and Messaging channel share one LINE provider (console
 * setup, deferred to go-live).
 *
 * Both personas run the same handshake; only the subject they bind to, the CSRF
 * cookie name, the callback path, and the JWT audience differ. Keying those four
 * by persona keeps the flow DRY and makes adding a third persona a one-line
 * change (OCP).
 */

export type LinePersona = "shop" | "customer";

export const LINE_OAUTH_STATE_TTL_SECONDS = 60 * 5; // 5 minutes

export const LINE_OAUTH_STATE_COOKIE: Record<LinePersona, string> = {
  shop: "lq_shop_line_oauth_state",
  customer: "lq_customer_line_oauth_state",
};

/** Path the LINE Login channel must whitelist as a Callback URL, per persona. */
export const LINE_OAUTH_CALLBACK_PATH: Record<LinePersona, string> = {
  shop: "/api/shop/line/callback",
  customer: "/api/customer/line/callback",
};

const STATE_AUD: Record<LinePersona, string> = {
  shop: "shop-line-oauth-state",
  customer: "customer-line-oauth-state",
};
const LINE_AUTHORIZE_URL = "https://access.line.me/oauth2/v2.1/authorize";
const LINE_TOKEN_URL = "https://api.line.me/oauth2/v2.1/token";
const LINE_PROFILE_URL = "https://api.line.me/v2/profile";

/** Upper bound on each LINE HTTP call so a hung endpoint can't stall the callback. */
const LINE_FETCH_TIMEOUT_MS = 5000;

/** Same signing secret as the session/login-intent JWTs (separated by `aud`). */
function getStateSecret(): Uint8Array {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "ADMIN_SESSION_SECRET must be set to a string of at least 32 chars.",
    );
  }
  return new TextEncoder().encode(secret);
}

// ----- Authorize URL (pure, unit-tested) ----------------------------------

export type AuthorizeUrlInput = {
  clientId: string;
  state: string;
  redirectUri: string;
};

/**
 * Build the LINE authorize URL. Pure (clientId is injected, not read from env)
 * so it is testable without configuration. `scope=profile openid` yields the
 * userId via /v2/profile; `bot_prompt=aggressive` prompts the add-friend step.
 */
export function buildLineAuthorizeUrl({
  clientId,
  state,
  redirectUri,
}: AuthorizeUrlInput): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    scope: "profile openid",
    bot_prompt: "aggressive",
  });
  return `${LINE_AUTHORIZE_URL}?${params.toString()}`;
}

// ----- State token (signed JWT; doubles as the CSRF `state` param) ---------

export type LineOAuthState = { subjectId: string; nonce: string };

/**
 * Mint a signed state token carrying the connecting subject's id (a shopId or a
 * customerId, per persona). The token IS the `state` query param; the route
 * handler also stores it in an httpOnly cookie and the callback requires
 * param === cookie (CSRF) before trusting subjectId. The persona's audience
 * pins the token to its own flow so a shop token can't be replayed as a
 * customer one.
 */
export async function signLineOAuthStateToken(
  persona: LinePersona,
  subjectId: string,
): Promise<string> {
  return new SignJWT({ subjectId, nonce: randomUUID(), aud: STATE_AUD[persona] })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${LINE_OAUTH_STATE_TTL_SECONDS}s`)
    .sign(getStateSecret());
}

export async function verifyLineOAuthStateToken(
  persona: LinePersona,
  token: string,
): Promise<LineOAuthState | null> {
  try {
    const { payload } = await jwtVerify(token, getStateSecret(), {
      algorithms: ["HS256"],
      audience: STATE_AUD[persona],
    });
    if (
      typeof payload.subjectId === "string" &&
      typeof payload.nonce === "string"
    ) {
      return { subjectId: payload.subjectId, nonce: payload.nonce };
    }
    return null;
  } catch {
    return null;
  }
}

// ----- Code → userId exchange ---------------------------------------------

export type ExchangeResult =
  | { ok: true; userId: string }
  | { ok: false; message: string };

/**
 * Exchange an authorization code for the LINE userId: POST the token endpoint,
 * then GET /v2/profile with the access token. Returns a typed result; the real
 * detail is console.error'd server-side and never surfaced to the caller.
 */
export async function exchangeLineCodeForUserId(
  code: string,
  redirectUri: string,
): Promise<ExchangeResult> {
  let clientId: string;
  let clientSecret: string;
  try {
    clientId = getLineLoginChannelId();
    clientSecret = getLineLoginChannelSecret();
  } catch (err) {
    console.error("LINE OAuth misconfigured:", err);
    return { ok: false, message: "missing_config" };
  }

  // 1. Authorization code → access token.
  let tokenRes: Response;
  try {
    tokenRes = await fetch(LINE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }).toString(),
      signal: AbortSignal.timeout(LINE_FETCH_TIMEOUT_MS),
    });
  } catch (err) {
    console.error("LINE token exchange network error:", err);
    return { ok: false, message: "network" };
  }
  if (!tokenRes.ok) {
    const body = await tokenRes.text().catch(() => "");
    console.error(
      `LINE token exchange failed (${tokenRes.status}):`,
      body.slice(0, 500),
    );
    return { ok: false, message: "token_error" };
  }

  let accessToken: string;
  try {
    const tokenJson = (await tokenRes.json()) as { access_token?: string };
    if (!tokenJson.access_token) {
      console.error("LINE token exchange returned no access_token");
      return { ok: false, message: "token_error" };
    }
    accessToken = tokenJson.access_token;
  } catch (err) {
    console.error("LINE token exchange parse error:", err);
    return { ok: false, message: "token_error" };
  }

  // 2. Access token → userId.
  let profileRes: Response;
  try {
    profileRes = await fetch(LINE_PROFILE_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(LINE_FETCH_TIMEOUT_MS),
    });
  } catch (err) {
    console.error("LINE profile network error:", err);
    return { ok: false, message: "network" };
  }
  if (!profileRes.ok) {
    const body = await profileRes.text().catch(() => "");
    console.error(
      `LINE profile fetch failed (${profileRes.status}):`,
      body.slice(0, 500),
    );
    return { ok: false, message: "profile_error" };
  }

  try {
    const profile = (await profileRes.json()) as { userId?: string };
    if (!profile.userId) {
      console.error("LINE profile returned no userId");
      return { ok: false, message: "profile_error" };
    }
    return { ok: true, userId: profile.userId };
  } catch (err) {
    console.error("LINE profile parse error:", err);
    return { ok: false, message: "profile_error" };
  }
}
