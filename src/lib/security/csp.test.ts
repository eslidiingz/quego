import { describe, expect, it } from "vitest";
import { buildCsp, PERMISSIONS_POLICY } from "./csp";

const directive = (csp: string, name: string) =>
  csp.split("; ").find((d) => d.startsWith(`${name} `)) ?? "";

describe("buildCsp — audit L4", () => {
  const prod = buildCsp({ dev: false });

  it("locks down plugins, <base>, framing and form targets", () => {
    expect(directive(prod, "object-src")).toBe("object-src 'none'");
    expect(directive(prod, "base-uri")).toBe("base-uri 'self'");
    expect(directive(prod, "frame-ancestors")).toBe("frame-ancestors 'none'");
    expect(directive(prod, "form-action")).toBe("form-action 'self'");
  });

  it("never allows eval or websockets in production", () => {
    expect(prod).not.toContain("'unsafe-eval'");
    expect(directive(prod, "connect-src")).not.toContain("ws:");
    expect(prod).toContain("upgrade-insecure-requests");
  });

  it("allows eval + HMR websocket only in dev", () => {
    const dev = buildCsp({ dev: true });
    expect(directive(dev, "script-src")).toContain("'unsafe-eval'");
    expect(directive(dev, "connect-src")).toContain("ws:");
    expect(dev).not.toContain("upgrade-insecure-requests");
  });

  it("keeps Firebase phone-OTP (reCAPTCHA) reachable", () => {
    expect(directive(prod, "script-src")).toContain("https://www.google.com");
    expect(directive(prod, "frame-src")).toContain("https://www.google.com");
    expect(directive(prod, "connect-src")).toContain("https://*.googleapis.com");
  });

  it("keeps geolocation for discovery, drops unused powerful features", () => {
    expect(PERMISSIONS_POLICY).toContain("geolocation=(self)");
    expect(PERMISSIONS_POLICY).toContain("camera=()");
  });
});
