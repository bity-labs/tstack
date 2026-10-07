# TStack Documentation

TStack's own documentation site, separate from the product documentation placeholder at `apps/boilerplate-docs`. Migrated from Fumadocs to [Nimbus Docs](https://nimbus-docs.com) (`@cloudflare/nimbus-docs`, Astro-based static output).

**Status:** Migrated to Nimbus Docs. Reader-facing content, public URLs, and the `/llms-full.txt` machine-readable endpoint are preserved; see [docs/migration-inventory.md](docs/migration-inventory.md) for the pre-migration inventory and URL mapping.

## Commands

From the repository root:

```sh
pnpm install                                             # installs workspace dependencies
pnpm --filter @tstack/documentation dev                  # dev server
pnpm --filter @tstack/documentation build                # production build (static output in dist/)
pnpm --filter @tstack/documentation typecheck            # astro check
pnpm --filter @tstack/documentation lint:docs            # Nimbus authoring lint
```

## Ownership and configuration

- The `@cloudflare/nimbus-docs` package provides content schemas, sidebar/TOC, Markdown/MDX alternates, `llms.txt`, OG cards, and the machine-readable agent endpoints.
- Reader content lives in `src/content/docs/`; the directory structure is both the URL structure and the sidebar.
- `AGENT.md` is the canonical authoring and upgrade guide; `CLAUDE.md` delegates to it.
- Shared final lint/test/format configuration belongs to the quality-tooling follow-up; this app has no fake passing checks.
