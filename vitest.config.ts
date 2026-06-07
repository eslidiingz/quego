import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Vitest configuration.
 *
 * Scope: pure logic modules (slot math, time helpers, insights aggregation,
 * form validation, LINE signature/link-code). Node environment — no DOM needed.
 *
 * The `@` alias mirrors tsconfig's `paths` so test files import the same way
 * the app does (`@/lib/...`). The `server-only` stub lets us import server
 * modules' pure exports (signature, classify, link-code) outside RSC context.
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
