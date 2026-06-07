import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Vitest configuration.
 *
 * Scope: pure, browser-safe logic modules only (slot math, time helpers,
 * insights aggregation, form validation). These carry no `server-only` marker
 * and touch no DB, so a plain Node environment is enough — no jsdom needed.
 *
 * The `@` alias mirrors tsconfig's `paths` so test files import the same way
 * the app does (`@/lib/...`).
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
