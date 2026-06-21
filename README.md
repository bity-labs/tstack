# TStack

TStack is organized as a pnpm/Turborepo monorepo. The generic engineering harness lives in `packages/harness`, the buyer-facing documentation app lives in `apps/documentation`, and the Agent-Ready Boilerplate lives in `apps/boilerplate`.

Documentation is available at <https://doc.tstack.dev/>.

## Layout

```txt
apps/
  boilerplate/       Next.js SaaS starter that dogfoods the shared harness.
  documentation/    Fumadocs documentation app for TStack users.
packages/
  cli/              Customer-facing TStack CLI package.
  harness/          Generic engineering harness package.
    templates/default/  Installable default harness payload.
docs/
  context.md        Durable monorepo context.
  coding-standards.md
  adr/              Monorepo architecture decision records.
```

## Harness dogfooding

In this monorepo, harness-owned assets are symlinked into the repo root and boilerplate app so local edits improve the product source of truth:

- `.agents` -> `packages/harness/templates/default/.agents`
- `docs/engineering` -> `packages/harness/templates/default/docs/engineering`
- `apps/boilerplate/.agents` -> `packages/harness/templates/default/.agents`
- `apps/boilerplate/docs/engineering` -> `packages/harness/templates/default/docs/engineering`

Project-owned working documents stay as real files and may diverge from the generic template: `AGENTS.md`, `docs/context.md`, `docs/coding-standards.md`, and `docs/adr/**` at each project root.

Any future installer or boilerplate scaffold must materialize all harness resources as real copied files so generated projects work in isolation without monorepo symlinks.

## Workspace commands

Use pnpm from the repository root:

```sh
pnpm build
pnpm dev:documentation
pnpm --filter @tstack/boilerplate dev
pnpm lint
pnpm test
pnpm typecheck
```

The `packages/cli` workspace contains the customer-facing TStack CLI. During local development, run it with `pnpm tstack <command>` from the repository root.

To install the private CLI globally from this checkout without publishing it to npm, run:

```sh
pnpm run setup
```

That builds `@tstack/cli` and links the `tstack` binary globally. Keep this repository checkout on disk because the linked CLI resolves the boilerplate from `apps/boilerplate` in this repo. After setup, run the CLI from any directory:

```sh
tstack init
tstack ready
tstack products
```

To remove the global link, run:

```sh
pnpm tstack:unlink
```

These commands are routed through Turbo and currently no-op cleanly for packages that do not define matching scripts.
