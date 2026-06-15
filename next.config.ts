import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // firebase-admin (server-side OTP ID-token verification) pulls in gRPC /
  // optional native deps that must NOT be bundled — keep it an external Node
  // require at runtime instead of letting Turbopack trace into it.
  serverExternalPackages: ["firebase-admin"],
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
