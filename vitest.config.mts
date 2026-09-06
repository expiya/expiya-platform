import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
      "server-only": fileURLToPath(new URL("./node_modules/server-only/empty.js", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    maxWorkers: 4,
    // Production-composition acceptance journeys intentionally exercise several
    // complete turns. Under full-suite worker contention they can exceed
    // Vitest's 5s unit-test default without any assertion or contract failure.
    testTimeout: 15_000,
  },
});
