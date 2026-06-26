import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Resolve the `@/*` path alias (mirrors tsconfig) so the pure lib modules can be
// imported in tests exactly as the app imports them. `server-only` is stubbed so
// server-side modules (the staged-upload applier) can be imported under node for
// the DB-backed integration test.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./src/test/server-only-stub.ts", import.meta.url)),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
