<p align="center">
  <img src="apps/documentation/public/logo.png" alt="TStack logo" width="180" />
</p>

<h1 align="center">TStack</h1>

TStack is a composable collection of reusable setup assets for a brain/vault, engineering harness, assistant, server, and product boilerplate. It uses one pnpm/Turborepo source workspace. Components are intended to be adopted independently; personal data, secrets, and live runtime state belong outside this repository.

## Current status

V2 is an empty shell around the existing generic harness, Fumadocs documentation app, and customer-facing CLI package. The new component directories contain README placeholders only, not runnable packages. V2 scaffolding is not implemented yet.

For the previous starter and its instructions, see the [preserved v1 documentation](https://github.com/bity-labs/tstack/tree/v1/apps/documentation/content/docs).

## Layout

```text
apps/
  documentation/             TStack's public Fumadocs documentation.
  boilerplate-website/       Placeholder: product marketing website.
  boilerplate-application/   Placeholder: product application.
  boilerplate-docs/          Placeholder: product documentation.
packages/
  brain/                    Placeholder: vault folder setup and skills.
  harness/                  Generic engineering harness templates.
  assistant/                Placeholder: Hermes-based coordination setup.
  os/                       Placeholder: server setup assets.
  cli/                      Retained customer-facing TStack CLI.
docs/                       Internal context, standards, and ADRs.
```

The planned boilerplate export is a standalone pnpm/Turborepo workspace with three independently deployable apps. Its implementation and shared packages are not defined yet.

## Repository development

Use Node.js 24 LTS and pnpm 10.28.1 (the version pinned in `package.json`).

```sh
pnpm install --frozen-lockfile
pnpm dev:documentation
```

Validate the implemented workspaces from the repository root:

```sh
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

README-only placeholders do not participate in Turbo tasks. The documentation app currently has placeholder test and lint scripts; its typecheck and build are real checks.

## CLI status

```sh
pnpm tstack --help
```

`tstack init` reports that v2 scaffolding is unavailable. `ready` and `products` remain legacy commands for existing compatible projects, not a v2 setup workflow. See [the CLI README](packages/cli/README.md) for local development and optional global linking.

## Harness reuse

The generic harness source lives in `packages/harness/templates/default`. This monorepo reuses it through two symlinks:

- `.agents` → `packages/harness/templates/default/.agents`
- `docs/engineering` → `packages/harness/templates/default/docs/engineering`

Editing these linked assets changes the reusable template. Project-owned `AGENTS.md`, context, standards, and ADRs remain real files. Installed projects must receive copies, not symlinks back to this checkout.

Start with [project context](docs/context.md), [coding standards](docs/coding-standards.md), and the [workspace ADR](docs/adr/0001-composable-v2-workspace.md).
