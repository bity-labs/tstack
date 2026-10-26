import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    // happy-dom serves component tests; the Effect welcome tests are
    // environment-agnostic and pass under the same DOM environment.
    environment: "happy-dom",
    setupFiles: [path.resolve(rootDir, "tests/setup.ts")]
  },
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "src")
    }
  }
});
