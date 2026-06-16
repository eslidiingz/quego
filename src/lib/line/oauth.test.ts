import { describe, it, expect } from "vitest";
import { buildLineAuthorizeUrl } from "@/lib/line/oauth";

describe("buildLineAuthorizeUrl", () => {
  const url = buildLineAuthorizeUrl({
    clientId: "1234567890",
    state: "STATE.TOKEN.VALUE",
    redirectUri: "https://quego.app/api/shop/line/callback",
  });
  const params = new URL(url).searchParams;

  it("targets the LINE authorize endpoint with response_type=code", () => {
    expect(url.startsWith("https://access.line.me/oauth2/v2.1/authorize?")).toBe(
      true,
    );
    expect(params.get("response_type")).toBe("code");
  });

  it("carries the client id, state, and redirect uri", () => {
    expect(params.get("client_id")).toBe("1234567890");
    expect(params.get("state")).toBe("STATE.TOKEN.VALUE");
    expect(params.get("redirect_uri")).toBe(
      "https://quego.app/api/shop/line/callback",
    );
  });

  it("requests profile scope and the aggressive add-friend prompt", () => {
    expect(params.get("scope")).toBe("profile openid");
    expect(params.get("bot_prompt")).toBe("aggressive");
  });

  it("url-encodes the redirect uri in the raw query string", () => {
    expect(url).toContain(
      "redirect_uri=https%3A%2F%2Fquego.app%2Fapi%2Fshop%2Fline%2Fcallback",
    );
  });
});
