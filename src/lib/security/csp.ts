/**
 * Content-Security-Policy + Permissions-Policy (audit L4), sent as static
 * headers from next.config.ts.
 *
 * script-src keeps 'unsafe-inline': App Router streams inline RSC scripts and
 * layout.tsx has the blocking theme script. A nonce would force every page to
 * render dynamically (see node_modules/next/dist/docs/01-app/02-guides/
 * content-security-policy.md), and a hash would switch 'unsafe-inline' off and
 * break Next's own inline scripts. The win here is everything else: no plugins,
 * no <base> hijack, no framing, forms post only to us, and script/connect/frame
 * limited to us + Firebase phone-OTP (reCAPTCHA).
 */

// Firebase Auth phone-OTP loads reCAPTCHA (script + iframe) and calls the
// Identity Toolkit / Secure Token REST APIs straight from the browser.
const GOOGLE_SCRIPT = ["https://www.google.com", "https://www.gstatic.com", "https://apis.google.com"];
const GOOGLE_FRAME = ["https://www.google.com", "https://recaptcha.google.com", "https://*.firebaseapp.com"];
const GOOGLE_CONNECT = ["https://*.googleapis.com", "https://www.google.com"];

export function buildCsp({ dev }: { dev: boolean }): string {
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    // React dev tooling needs eval; production never gets it.
    "script-src": ["'self'", "'unsafe-inline'", ...(dev ? ["'unsafe-eval'"] : []), ...GOOGLE_SCRIPT],
    "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    "font-src": ["'self'", "data:", "https://fonts.gstatic.com"],
    // Shop images (R2 host is env-configurable) and LINE profile pictures.
    "img-src": ["'self'", "data:", "blob:", "https:"],
    "connect-src": ["'self'", ...GOOGLE_CONNECT, ...(dev ? ["ws:"] : [])],
    "frame-src": GOOGLE_FRAME,
    "worker-src": ["'self'", "blob:"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };
  const policy = Object.entries(directives).map(([k, v]) => `${k} ${v.join(" ")}`);
  if (!dev) policy.push("upgrade-insecure-requests");
  return policy.join("; ");
}

// Nothing in the app uses these; geolocation stays on for "near me" discovery.
export const PERMISSIONS_POLICY =
  "camera=(), microphone=(), payment=(), usb=(), geolocation=(self)";
