import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  experimental: {
    // Shop logo/cover uploads stream through a server action; the default 1MB
    // body cap would reject a cover. The client crops to a fixed size before
    // upload (logo ~512px PNG, cover ~1600×600 JPEG) so real payloads are far
    // smaller — this is the outer envelope; lib/validation/media.ts enforces
    // the real per-slot caps (2 MB logo / 4 MB cover).
    //
    // NB: bodySizeLimit is GLOBAL to every server action, not just uploads, so
    // all actions now accept bodies up to 5 MB (each still validates its own
    // inputs). The image caps above are the meaningful bound for the upload path.
    serverActions: { bodySizeLimit: "5mb" },
  },
  // SEC-05: baseline HTTP security headers on every route (defense-in-depth).
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
