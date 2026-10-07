# Pre-migration inventory — apps/documentation (Fumadocs)

Captured on branch v2 at merge commit `330182e` (PR #70), before any
Nimbus migration changes. This document drives issue #58 acceptance:
content, navigation, public URLs, assets, and machine-readable endpoints
that must survive the Fumadocs → Nimbus Docs migration.

## Stack before migration

- Next.js 16 (`next build` / `next dev`), App Router under `src/app/`.
- Fumadocs (`fumadocs-core` 16.3.2, `fumadocs-mdx` 14.2.2, `fumadocs-ui` 16.3.2) with `fumadocs-mdx` MDX pipeline and `source.config.ts`.
- Tailwind CSS v4 via `@tailwindcss/postcss` + `postcss.config.mjs`.
- Scripts: `build`, `dev`, `typecheck` (`fumadocs-mdx && tsc --noEmit`); `lint`/`test` are placeholder echo scripts (never presented as coverage).

## Content inventory (16 pages)

Fumadocs collection root: `content/docs/`, `baseUrl: "/"`. Each entry lists title/description from frontmatter; body files are the migrated content.

| Source file | Public URL | Notes |
| --- | --- | --- |
| `content/docs/index.mdx` | `/` | Landing page with component status table + start-here links |
| `content/docs/getting-started/index.mdx` | `/getting-started` | Getting-started index |
| `content/docs/getting-started/prerequisites.mdx` | `/getting-started/prerequisites` | |
| `content/docs/getting-started/quick-start.mdx` | `/getting-started/quick-start` | |
| `content/docs/harness/overview.mdx` | `/harness/overview` | |
| `content/docs/harness/installation.mdx` | `/harness/installation` | |
| `content/docs/harness/template-structure.mdx` | `/harness/template-structure` | |
| `content/docs/harness/skills.mdx` | `/harness/skills` | |
| `content/docs/harness/workflows.mdx` | `/harness/workflows` | |
| `content/docs/harness/supported-agents.mdx` | `/harness/supported-agents` | |
| `content/docs/harness/known-limitations.mdx` | `/harness/known-limitations` | |
| `content/docs/boilerplate/overview.mdx` | `/boilerplate/overview` | |
| `content/docs/reference/commands.mdx` | `/reference/commands` | |
| `content/docs/reference/cli.mdx` | `/reference/cli` | |
| `content/docs/reference/troubleshooting.mdx` | `/reference/troubleshooting` | |
| `content/docs/reference/known-limitations.mdx` | `/reference/known-limitations` | |

No content pages use a Fumadocs UI metadata shell (`full`, components, or icons imported from `fumadocs-ui`); pages are plain Markdown/MDX besides frontmatter, so content migrates without component rewrites.

## Navigation inventory

Two sidebars/navigation sources:

1. `content/docs/meta.json` — root nav order: `index`, `getting-started`, `harness`, `boilerplate`, `reference`, plus a pseudo-entry `[LLM Documentation](/llms-full.txt)` that appears in the sidebar as a link to the LLM endpoint (not a docs page).
2. `content/docs/<section>/meta.json` — per-section order (as listed above: e.g. Harness uses `overview, installation, template-structure, skills, workflows, supported-agents, known-limitations`; Reference uses `commands, cli, troubleshooting, known-limitations`).

Section titles: `getting-started` → "Getting Started", `harness` → "Harness", `boilerplate` → "Boilerplate", `reference` → "Reference", root → "TStack".

Top navigation (`src/lib/layout.shared.tsx`): TStack `/logo.png` image (120×32) linking to `/`, plus a "GitHub" link and `githubUrl` both pointing at `https://github.com/bity-labs/tstack`.

## Assets inventory

Only three files under `public/`:

- `public/logo.png` — header brand image (used in every Fumadocs page header).
- `public/og.png` — default OpenGraph image (`metadata.openGraph` in `src/app/layout.tsx`).
- `public/favicon.ico` — favicon (`metadata.icons.icon`).

No other static assets are referenced by content (grep confirmed: no `![` images or additional asset links in `content/`).

## Machine-readable endpoints inventory

| Route file | URL | Behavior |
| --- | --- | --- |
| `src/app/llms-full.txt/route.ts` | `GET /llms-full.txt` | Aggregates every docs page via `getLLMText(page)` (page title + processed markdown body) into a single `text/plain; charset=utf-8` document. `revalidate = false`. |

There is no `/llms.txt` index route, no sitemap, no per-page markdown endpoints, and no OpenAPI/JSON endpoints. The `/llms-full.txt` endpoint is the only machine-readable behavior and must be retained or mapped (issue wording: "including the existing llms endpoint").

## In-content internal links (absolute-path style)

Content uses absolute internal links, e.g. `/getting-started/quick-start`, `/harness/overview`, `/reference/cli`, `/harness/installation`, `/boilerplate/overview`. External links go to `https://github.com/bity-labs/tstack` paths (v1 branch preservation links). All these URLs must keep working after migration.

## Internal headers/config files (no reader-visible contract)

- `source.config.ts` (Fumadocs MDX collection config), `next.config.mjs` (Fumadocs `createMDX` wrapper), `postcss.config.mjs` (Tailwind v4 PostCSS), `tsconfig.json`, `src/app/*` (Next routing/route handlers), `src/lib/source.ts`, `src/lib/layout.shared.tsx`, `src/mdx-components.tsx`. These are free to be replaced by Nimbus/Astro equivalents.

## Migration decisions (verified after implementation)

- Serving stays in-repo on Astro static output (`astro build` → `dist/`); no new hosting provider was selected, and no URL changed, so no redirect rules are required. The 16 pre-migration URLs are byte-for-byte identical slugs (verified against `dist/` directory output and `astro preview` HTTP responses).
- Navigation order preservation: Fumadocs `meta.json` order (root + per-section) is reproduced via the Nimbus `sidebar.items` config in `astro.config.ts` plus per-page `sidebar.order` frontmatter migrated from each `meta.json` entry.
- Assets: `public/logo.png` (referenced by the repository root README) and a favicon are retained. The Fumadocs header logo image (`/logo.png` in top nav) is replaced by Nimbus's text title in the header (`config.title` = "TStack Documentation") with a header GitHub icon replacing the Fumadocs "GitHub" links (`github: https://github.com/bity-labs/tstack`). `public/og.png` is replaced by Nimbus's generated per-page/site OG cards (`/og.png`, `/og/<slug>`); the static file itself is not carried over.
- Machine-readable endpoints: `GET /llms-full.txt` is retained (Nimbus `llmsFullRoute`), and the migration makes it the *index* of the agent docs (`llms.txt` links to it) instead of the Fumadocs processed-markdown concatenation; page markdown alternates (`/<path>.md`, `/<path>.mdx`), `/llms.txt` (root + per-section), `/nimbus-api/coordinates.json`, and `robots.txt`/`sitemap-index.xml` are additive.
- Sidebar pseudo-entry `[LLM Documentation](/llms-full.txt)`: intentionally not re-created as a fake page in the content tree; the same audience is served by the persistent `AgentDirective` (pointing at `/llms.txt`) and this mapping statement.

## Migration URL mapping statement

- All 16 content page URLs are preserved unchanged (identical slug tree under `/`).
- Per-page alternates added by Nimbus (`/llms.txt`, per-section `/llms.txt` variants, and per-page `.md` markdown alternates, plus OG card routes `og/*` and `robots.txt`, `sitemap-index.xml`) are additive and do not remove or replace the retained `/llms-full.txt` behavior — they extend it.
- The only lossy item is the sidebar's `[LLM Documentation](/llms-full.txt)` pseudo-entry (it is not a page, so Nimbus's directory-based sidebar cannot model it as-is). This link also appears via the standard Nimbus `AgentDirective` (pointing agents at `/llms.txt`) and via the top navigation; it is documented as intentionally dropped from the sidebar to avoid a fake content-tree entry.
- Root `/` URL was previously served by Fumadocs' `content/docs/index.mdx` as a docs page; the migrated site serves `src/content/docs/index.mdx` at `/` with the same title/description/body, so content is preserved.
