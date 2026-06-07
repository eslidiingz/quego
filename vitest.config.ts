import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Unit-test config. Node environment (these are pure server-lib tests, no DOM).
 * Two resolve aliases:
 *   - "@/…" → src, matching the tsconfig path alias.
 *   - "server-only" → a no-op stub, because the real package throws when imported
 *     outside React Server Components (which is every Vitest run). This lets us
 *     import server modules' pure exports (signature, classify, link-code).
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: [
      {
        find: /^@\//,
        replacement: fileURLToPath(new URL("./src/", import.meta.url)),
      },
      {
        find: /^server-only$/,
        replacement: fileURLToPath(new URL("./test/empty.ts", import.meta.url)),
      },
    ],
  },
});
