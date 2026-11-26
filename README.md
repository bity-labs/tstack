# TStack

> [!WARNING]
> **Work in progress:** This branch contains the next version of TStack, which is still under development and is not yet stable.
> The latest stable version is **V1**, available on the [`v1` branch](https://github.com/bity-labs/tstack/tree/v1).

TStack contains its public website and documentation, alongside a self-contained SaaS boilerplate and a generic engineering harness. The boilerplate is developed directly in `packages/boilerplate`; it has no generated development copy or nested template directory.

## Requirements

- Node.js 24 or newer
- pnpm 10.28.1

## Repository boundaries

- [`apps/website`](apps/website/README.md): TStack's public Astro website, port 4321.
- [`apps/docs`](apps/docs/README.md): TStack's Nimbus documentation, port 4322.
- [`packages/boilerplate`](packages/boilerplate/README.md): independent pnpm/Turbo workspace containing the SaaS commercial website, documentation, API, web app, mobile app, MCP server, generated SDK, and their tooling.
- [`packages/harness`](packages/harness/README.md): generic engineering harness evolved from `v1`, with 14 skills, method-owned references, conditional risk guides and explicit invocation rules. It has no dependencies or build step. The boilerplate retains its independent V1 harness snapshot and separate project-specific stack rules; source changes do not update that snapshot automatically.
- [`packages/typescript-config`](packages/typescript-config/README.md) and [`packages/eslint-config`](packages/eslint-config/README.md): tooling for the TStack sites only.

The root workspace explicitly excludes `packages/boilerplate`. Each workspace owns its manifest, lockfile, Turbo configuration, formatting, and dependencies. The boilerplate includes its own TypeScript/ESLint configurations so it can be copied out without depending on TStack's packages. The two sets can evolve independently; a change to one does not update the other.

TStack's own website and published documentation are not included in a SaaS project. The boilerplate includes separate, customizable `apps/website` and `apps/docs` applications for the SaaS product, plus its technical documentation and local agent harness. API/web/native code follows the [feature architecture](packages/boilerplate/docs/feature-architecture.md); the [stack guides](packages/boilerplate/docs/README.md) adapt the former Next.js conventions to Effect, TanStack Start and Expo. A project-generation CLI is not implemented yet.

## Work on the TStack sites

```sh
pnpm install --frozen-lockfile
pnpm dev
```

`dev` starts only the website and documentation. It does not install or start the boilerplate. Filtered commands at the repository root select only TStack workspaces, for example `pnpm --filter @tstack/docs build`.

## Work on the boilerplate

The boilerplate uses Bun `1.4.4` for local development/tooling in addition to pnpm; Bun is not its deployed Worker runtime. From the TStack root, install the second workspace and configure the API:

```sh
pnpm install:boilerplate --frozen-lockfile
cp packages/boilerplate/apps/api/.env.example packages/boilerplate/apps/api/.env
# Set BETTER_AUTH_SECRET in that file to a stable random secret.
# Generate one with: openssl rand -base64 32
pnpm generate
pnpm dev:boilerplate
```

`dev:boilerplate` starts the Effect API (4000), TanStack Start application (3000), SaaS commercial website (4323), SaaS documentation (4324), and OpenAPI/Orval watchers. Its sites can run alongside TStack's website (4321) and docs (4322). Edit the sources in `packages/boilerplate` directly; changes use the development servers and watchers. In separate terminals, `pnpm dev:mobile` starts Expo and `pnpm storybook` starts web Storybook. Use `pnpm storybook:mobile` for native Storybook, not at the same time as the ordinary Expo server.

To target a boilerplate package without changing directories:

```sh
pnpm --dir packages/boilerplate --filter @tstack/api test
pnpm --dir packages/boilerplate --filter @tstack/web dev
pnpm --dir packages/boilerplate --filter @tstack/mobile test
```

The stdio MCP server is launched by an MCP client, not a browser dev process. See the [boilerplate README](packages/boilerplate/README.md) for SDK generation, authentication, SQLite, native configuration, and package-specific commands. No cloud account or deployment is required for local checks.

## Checks

After installing both workspaces:

```sh
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm storybook:build
```

These commands cover both workspaces where applicable. Static website/docs checks are lint, typecheck, and build; their manifests do not contain placeholder tests. Root `test`, `generate`, and Storybook commands delegate to the boilerplate. `build` includes mobile JavaScript/Hermes exports, not native binaries or store submissions.

For the boilerplate alone, use `pnpm test:boilerplate`, `pnpm build:boilerplate`, or `pnpm check:boilerplate`. The last command runs formatting, lint, types, offline infrastructure checks, tests, all builds, and web Storybook. Run just its infrastructure gate with `pnpm --dir packages/boilerplate infra:check`. To check only the TStack sites, use `pnpm exec turbo run lint typecheck build`. The boilerplate's [deployment guide](packages/boilerplate/docs/stack/deployment.md) covers Cloudflare-only deployment through Alchemy `2.0.0-beta.87`: API/web Workers, D1, static website/docs and a native web→API service binding. Workers run workerd with `nodejs_compat`, not Bun. Local Bun SQLite is a development fixture, not a self-hosting target. These files do not deploy TStack's own sites; cloud operations, including plan/state bootstrap, require separate operator approval and have not been validated by local checks.

Each SaaS application versions its non-secret deployment settings in [`infra/project.ts`](packages/boilerplate/infra/project.ts), including a stable distinct `name`. Created Cloudflare resources share its visible `<name>-cloudflare-<stage>-<role>` prefix; stages isolate environments. Better Auth's native Alchemy integration generates and retains a secret per stack/stage and injects a Worker secret binding; GitHub only needs the Cloudflare API token. Preserve existing resource/state identities and review externally supplied secret adoption separately. After one-time operator activation, the boilerplate deploys pushes to `staging` and `main` to staging and production, respectively, only after full CI succeeds. It uses branch-restricted `cloudflare-<stage>` environments; see its [activation guide](packages/boilerplate/docs/stack/deployment.md#automatic-branch-deployments). These nested workflows do not deploy TStack itself.

Root CI checks the TStack sites and independently exports the boilerplate into a temporary directory outside the checkout. It installs that copy with its own frozen lockfile, checks OpenAPI/SDK drift, and runs its full checks. The boilerplate also includes a standalone CI workflow for projects copied out of this repository.

## Use the boilerplate independently

Copy **the contents of `packages/boilerplate`**, including dotfiles and its lockfile, to a new project directory. Do not copy `node_modules`, local `.env` files, SQLite databases, or generated build/cache directories. Do not copy TStack's root manifest, lockfile, website, or docs. Then follow the copied README, starting with `pnpm install --frozen-lockfile`.

No publishing or generator CLI is required for this manual workflow. The local harness is included; its copied assets do not synchronize automatically with `packages/harness`. Packaging and project renaming remain separate future work.

## Amp development

The root `.agents/skills` and `.agents/invocation.md` are relative symlinks to the generic harness in `packages/harness/templates/default/.agents/`. Amp discovers the 14 skills without copying them; changes to the harness source are reflected here. Skill descriptions are available for discovery, while instructions and references load on demand. After adding or changing skills, reload skills in the running Amp session.

These links are for working on TStack. They do not install template project documentation at the root or update the boilerplate's independent harness snapshot. See [AGENTS.md](AGENTS.md) for project context and reference-resolution guidance.

From this repository root, `amp orb services ensure` starts six supervised browser services: TStack's website/docs, and the boilerplate's API/web/website/docs. It returns their portal links. Install both workspaces and configure the API secret first. Boilerplate commands explicitly target the nested workspace. The independent boilerplate has its own `.amp/services.yaml` for its four browser services; do not run both service sets simultaneously on the same ports. Expo/device networking remains separate from browser portals.

Source, comments, UI copy, and documentation are in English. See [AGENTS.md](AGENTS.md) for repository boundaries and [the boilerplate guidance](packages/boilerplate/AGENTS.md) for SaaS implementation rules.

The `new-start` branch retains Git history; earlier implementations remain available on `main`, `v1`, and `v2`.
