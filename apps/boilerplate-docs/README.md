# Boilerplate Documentation

The customer-facing documentation app for products built with the TStack v2 boilerplate, separate from TStack's own documentation in `apps/documentation`.

**Status:** Minimal [Nimbus Docs](https://nimbus-docs.com) scaffold (`@cloudflare/nimbus-docs`, Astro-based) with one introduction page.

## Commands

From the repository root:

```sh
pnpm install                                             # installs workspace dependencies
pnpm --filter @tstack/boilerplate-docs dev               # dev server (renders the introduction page)
pnpm --filter @tstack/boilerplate-docs build             # production build (static output in dist/)
pnpm --filter @tstack/boilerplate-docs typecheck         # astro check
pnpm --filter @tstack/boilerplate-docs lint:docs         # Nimbus authoring lint
pnpm --filter @tstack/boilerplate-docs test              # Vitest content tests with coverage
```

## Ownership and configuration

- The `@cloudflare/nimbus-docs` package provides the plumbing (Astro integration, content schemas, sidebar/TOC, Markdown/MDX alternates, `llms.txt`).
- Everything under `src/`, plus `astro.config.ts`, `nimbus.json`, `AGENT.md`, and `CLAUDE.md`, is project-owned scaffold output — edit freely.
- `AGENT.md` is the canonical authoring and upgrade guide; `CLAUDE.md` delegates to it.
- `nimbus.json` records the scaffold provenance; keep it committed and manage it only through the Nimbus CLI.
- Replace the placeholder `site` value in `astro.config.ts` with the production docs URL.
- Vitest tests validate the introduction-page content and the Nimbus wiring (`tests/`); coverage is collected without a percentage gate. No placeholder or unconditional-success checks.
