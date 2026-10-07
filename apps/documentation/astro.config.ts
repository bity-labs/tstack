import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import nimbus, {
  defineConfig as defineNimbusConfig,
} from "@cloudflare/nimbus-docs";
import { tableScroll } from "@cloudflare/nimbus-docs/markdown";

const nimbusConfig = defineNimbusConfig({
  // Canonical origin (no trailing slash). Drives canonical URLs, absolute OG
  // image URLs, robots.txt, sitemap, and the /llms.txt links.
  site: "https://docs.example.com",
  title: "TStack Documentation",
  description:
    "Documentation for TStack's composable setup components and current implementation status.",
  locale: "en",
  github: "https://github.com/bity-labs/tstack",
  socialImageAlt: "TStack documentation preview",
  // Explicit sidebar items preserve the pre-migration Fumadocs nav order
  // (content/docs/meta.json): index, Getting Started, Harness, Boilerplate,
  // Reference. Per-page order within each section comes from
  // `sidebar.order` frontmatter migrated from each section's meta.json.
  sidebar: {
    items: [
      { label: "TStack", link: "/" },
      { label: "Getting Started", autogenerate: { directory: "getting-started" } },
      { label: "Harness", autogenerate: { directory: "harness" } },
      { label: "Boilerplate", autogenerate: { directory: "boilerplate" } },
      { label: "Reference", autogenerate: { directory: "reference" } },
    ],
  },
});

export default defineConfig({
  output: "static",
  // Tailwind v4 via its Vite plugin (the integration Astro recommends for
  // Tailwind v4 — replaces the PostCSS plugin, which doesn't build under
  // Astro 7's Vite 8 bundler).
  vite: {
    plugins: [tailwindcss()],
  },
  // Hover-prefetch link targets so full-page navigations feel instant without
  // a client-side router.
  prefetch: {
    prefetchAll: true,
    defaultStrategy: "hover",
  },
  integrations: [
    nimbus(nimbusConfig, {
      rules: {
        "nimbus/frontmatter-shape": "error",
        "nimbus/internal-link": "error",
      },
      markdown: {
        hastPlugins: [tableScroll()],
      },
    }),
  ],
});
