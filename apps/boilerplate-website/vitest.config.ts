import { getViteConfig } from "astro/config";
import { defineConfig } from "vitest/config";

// getViteConfig wires Astro's own Vite plugins (SSR + .astro compilation,
// container runtime) so Vitest can render real pages with the container API.
export default defineConfig(async () => ({
  ...(await getViteConfig({})({ command: "serve", mode: "test" })),
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node"
  }
}));
