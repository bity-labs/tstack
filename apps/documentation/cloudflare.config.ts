import { bindings, defineConfig, defineWorker, triggers } from "cf/config";

export default defineConfig({
  worker: defineWorker({
    name: "tstack-docs",
    entrypoint: "vinext/server/fetch-handler",
    compatibilityDate: "2026-11-26",
    triggers: [triggers.fetch({ pattern: "doc.tstack.dev/*", zone: "tstack.dev" })],
    assets: {
      htmlHandling: "none",
      notFoundHandling: "none",
      runWorkerFirst: ["/*", "!/_next/static/*", "!/*/_next/static/*"],
    },
    env: {
      ASSETS: bindings.assets(),
    },
  }),
});
