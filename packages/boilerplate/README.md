# TStack SaaS boilerplate

A standalone SaaS foundation built with pnpm and Turborepo. Independent applications share a generated API client and strict tooling, not backend implementation or database access. Better Auth provides email/password and passwordless email-code access with independent web/native sessions. Billing, tenants and product features are not configured.

This directory is the complete project root, whether it lives at `packages/boilerplate` inside TStack or has been copied to a separate repository. All paths and commands in this README and the application READMEs are relative to this directory. Its manifest, lockfile, tooling, and CI are independent of TStack's website and documentation; no parent installation is required.

## Requirements

- Node.js 24 or newer
- pnpm 10.28.1
- Bun 1.4.4 for local development/tooling (not the deployed Worker runtime)

## Getting started

```sh
pnpm install --frozen-lockfile
cp apps/api/.env.example apps/api/.env
# Set BETTER_AUTH_SECRET in apps/api/.env to a stable random secret.
# Generate one with: openssl rand -base64 32
pnpm generate
pnpm dev
```

## Structure

- [`apps/website`](apps/website/README.md): your product's commercial Astro website, port 4323.
- [`apps/docs`](apps/docs/README.md): your product's Nimbus documentation on Astro, port 4324.
- [`apps/web`](apps/web/README.md): TanStack Start, React, Vite, Tailwind and local shadcn/ui; port 3000. Uses generated TanStack Query hooks.
- [`apps/api`](apps/api/README.md): Effect TypeScript HTTP contract and server; Bun SQLite locally on port 4000, Cloudflare Worker/D1 when deployed.
- [`apps/mcp`](apps/mcp/README.md): official TypeScript MCP SDK with a read-only health tool over stdio; uses the HTTP SDK and Effect.
- [`apps/mobile`](apps/mobile/README.md): Expo/React Native, Metro, native Storybook and Jest. Start separately on a device or simulator.
- [`packages/sdk`](packages/sdk/README.md): Orval-generated HTTP client, models and React Query hooks.
- [`packages/typescript-config`](packages/typescript-config/README.md): shared strict compiler settings.
- [`packages/eslint-config`](packages/eslint-config/README.md): shared flat TypeScript lint configuration.

Applications belong in `apps/*`, reusable packages in `packages/*`. There is no shared UI package yet: DOM components and web stories stay in `apps/web`; native components and native stories stay in `apps/mobile`. React Native is not a consumer of DOM shadcn/ui components.

API, web and mobile capabilities live under `src/features/<feature-name>` with kebab-case custom filenames and explicit public exports. Routes and startup modules compose features; technical clients and storage stay in `src/lib`. See [technical documentation](docs/README.md) for the implemented boundaries, naming conventions, TanStack Start adaptation and ADRs.

The local `.agents/skills` and `docs/engineering` directories contain unchanged copies of the generic V1 harness. Project-specific rules live in `AGENTS.md`, `docs/coding-standards.md`, `docs/feature-architecture.md` and `docs/stack`. They are included when copying this repository; no parent link or separate installer is needed. Public product documentation remains in `apps/docs`.

## Commands

```sh
pnpm dev
pnpm build
pnpm lint
pnpm test
pnpm typecheck
pnpm format:check
pnpm infra:check
pnpm generate
pnpm storybook
pnpm storybook:build
pnpm check
```

Root commands orchestrate workspace scripts through Turbo. `dev` starts the commercial website, documentation, web application, API, and contract/client watchers; it excludes Expo, which needs its own terminal and device networking. Website/docs use 4323/4324 to avoid collisions with TStack's own sites on 4321/4322. The stdio MCP server is launched by an MCP client, not a browser dev process. `test` uses `turbo run test --concurrency=1` to run one package suite at a time. `infra:check` runs offline infrastructure typechecks/tests. `check` runs formatting, lint, types, infrastructure checks, tests, all builds, and web Storybook. Static website/docs have lint/typecheck/build checks, not placeholder tests. `build` includes iOS and Android JavaScript/Hermes exports, **not** native binaries, signing or store uploads.

Web, API, SDK and MCP tests use Vitest. Storage integration needs real Bun SQLite subprocesses and local workerd/D1 checks; local SQLite alone does not prove deployed D1 behavior. Mobile-local unit/component tests use Jest with `jest-expo`. Package suites keep their own runner settings and assertion timeouts. Web Storybook uses the TanStack React/Vite integration. Native Storybook is separate:

```sh
pnpm dev:mobile
pnpm storybook:mobile
pnpm --filter @tstack/mobile test
```

## Contract and client workflow

1. Change the feature's Effect `.schema.ts` and `.api.ts` modules in `apps/api/src/features`, compose its contract in `src/contract.ts`, and implement its `.handlers.ts` module. Register runtime handlers in `src/server.ts`; keep the contract independent of database/auth initialization.
2. Run `pnpm generate`. Turbo exports `apps/api/generated/openapi.json` without a running server or SQLite, then generates `packages/sdk/src/generated` with Orval.
3. Consume HTTP functions/models through `@tstack/sdk`, or React hooks through `@tstack/sdk/react`. Commit the contract and generated changes together. Never edit generated sources by hand.

Generation also runs before SDK/dependent builds. Development watchers refresh the exported contract and client; CI regenerates and rejects drift. This is contract-first in Effect: OpenAPI is an exported artifact, not a second handwritten contract. Generated types do not validate arbitrary HTTP responses at runtime.

## Local configuration

Each runtime that needs configuration has an `.env.example`; these examples are not secrets and are not automatically loaded by every runtime. Set variables in the invoking shell unless its README says otherwise.

- API local fixture: `PORT` (4000), `DATABASE_PATH` (`tstack.sqlite` in the API working directory), `WEB_ORIGIN` (`http://localhost:3000`), `BETTER_AUTH_URL` (canonical public auth origin), and required `BETTER_AUTH_SECRET` (at least 32 random characters). The development script loads `apps/api/.env`. Keep the secret stable. Deployed configuration uses Worker bindings/secrets and D1, not a local file or Bun runtime. Auth/business migrations must finish before healthy/schema-dependent success; storage/migration errors fail with 503.
- Web server locally: `API_URL` (`http://127.0.0.1:4000`). Deployed web→API uses a native Worker service binding. The credentialed GET/POST proxy keeps browser SDK and Better Auth requests same-origin in both environments. Set trusted/public origins to the actual portal or deployed HTTPS origins, not an internal transport address.
- MCP: `API_URL` with an absolute API origin. See its README for stdio client configuration; stdout must remain JSON-RPC only.
- Product docs: set `SITE_URL` to the real public documentation origin before publication, and customize the neutral product branding. It is independent of the TStack documentation's URL.
- Mobile: set `EXPO_PUBLIC_API_URL` to a device-reachable API origin; release use requires HTTPS. Native Storybook requires the explicit development-only `EXPO_PUBLIC_STORYBOOK_ENABLED=true` flag; the package script sets it. Production exports disable it.

Authentication routes use the official Better Auth clients, not a second generated auth protocol. The protected Effect `GET /me` route stays in OpenAPI/Orval. Web cookies are HttpOnly and native cookies persist through Expo SecureStore; each device has an independent server-side session. Email codes use native Better Auth hashing/expiry/attempt limits. Local emails are captured under `apps/api/.local/emails` (`AUTH_EMAIL_DIRECTORY` overrides it); never expose or commit these credentials. Production uses Cloudflare Email Sending with `project.emailFrom` and operator-completed domain onboarding. Real delivery remains unverified. Password recovery and social providers have no configured product flows. Read the [auth guide](docs/stack/auth-guide.md#email-code-access), especially the removal of unproven passwords/sessions when an existing unverified email is first proven.

No cloud account, deployment, EAS project or signing credentials are required for local checks. On an Amp orb, `amp orb services ensure` starts the declared supervised browser services and returns their portal links. Expo remains separate because a browser portal does not provide native device connectivity.

## Deployment

Cloudflare is the only supported deployment target. Alchemy and its integrations are pinned to `2.0.0-beta.87`; the API uses the Alchemy Better Auth integration. API and TanStack Start SSR run as Workers on workerd with `nodejs_compat`, backed by D1. Website/docs deploy as static assets; set the docs `SITE_URL` before building. Deployed web→API traffic uses a native service binding while browsers keep the same-origin proxy and native/MCP clients keep HTTP. pnpm/Turbo, Effect contracts, Orval and the official Better Auth React/Expo clients remain. See [ADR 0006](docs/adr/0006-cloudflare-only.md).

Bun `1.4.4` runs local development/tooling and the SQLite development fixture, not Workers. There is no supported self-hosting, Node-server, Docker/Compose/Coolify, VM, tunnel or SSH deployment path. SQLite→D1 is a separately reviewed data migration, not an automatic or transparent consequence of deployment. Preserve the auth secret, data and SQL migration histories; reject edits to applied SQL.

Edit and commit [`infra/project.ts`](infra/project.ts) for each application: stable project `name`, Cloudflare account/zone IDs, zone, explicit state Worker name, email sender and staging/production domains. The example IDs are intentionally empty; unconfigured projects fail before provider loading. These non-secret values are versioned, not GitHub environment variables. Created resources retain the visible `<name>-cloudflare-<stage>-<role>` naming scheme, for example `saas1-cloudflare-staging-api`. Name changes, particularly D1/state names, can create separate resources rather than move existing data; review identities and migration before changing them. Do not provision unused resources.

Deployed Better Auth uses its native Alchemy default: generate a random secret once per stack/stage, retain it in encrypted state and inject it as a Worker secret. Only `CLOUDFLARE_API_TOKEN` is needed as a GitHub secret. Preserve state and the `BetterAuthSecret` resource identity across releases; replacing them can invalidate sessions. Existing deployments with externally supplied secrets require separately reviewed adoption, not an automatic switch. Local Bun development still needs `BETTER_AUTH_SECRET` in `apps/api/.env`. See [secret ownership](infra/README.md#better-auth-secret-ownership).

After one-time operator activation, standalone CI automatically calls `.github/workflows/deploy.yml` after all checks succeed: pushes to `staging` deploy staging and pushes to `main` deploy production. Pull requests and other branches never deploy. Configure branch-restricted `cloudflare-staging`/`cloudflare-production` environments and the scoped Cloudflare token, customize `infra/project.ts`, then set the repository variable `ALCHEMY_DEPLOY_ENABLED=true`. No manual dispatch or environment reviewer is required by the workflow; existing GitHub protection rules still apply. These nested workflows are distributed source inside TStack, not active TStack deployments. See [automatic branch deployments](docs/stack/deployment.md#automatic-branch-deployments) for activation, approval scope and verification requirements.

Read the [infrastructure README](infra/README.md) for exact configuration/commands, [deployment](docs/stack/deployment.md) for acceptance gates, and [operations](docs/stack/operations.md) for D1 export/isolated restore safety. Installation and local checks authorize no cloud operations—not even plan/dev or remote state bootstrap. Explicitly activating branch automation authorizes its routine releases; local CLI operations, migration adoption and recovery still need separate approval. Actual deployment and recovery require evidence. Native failed-logout retries remain in-memory only and can be lost when the app terminates; see the [auth guide](docs/stack/auth-guide.md).

## Quality checks

CI installs the frozen lockfile, checks generated drift, formatting, lint, types, tests, builds and web Storybook. Run the same commands locally before opening a change. Native exports and mocked-native Jest tests do not replace simulator/device checks; production native builds remain a separate step.

Source, comments, UI copy and documentation are written in English. See [AGENTS.md](AGENTS.md) for repository-specific agent boundaries. Use small, focused commits; add business behavior only when its requirements are decided.

## Copying this project

Copy this directory's contents, including dotfiles, `pnpm-lock.yaml`, `.github/workflows/ci.yml`, and `AGENTS.md`, into a new project directory. Exclude dependency installations, local secrets, SQLite files, and build/cache outputs. Install with `pnpm install --frozen-lockfile`, configure the API secret, and use the same commands above. Your product's website and documentation are included; TStack's own sites and parent files are not needed. No separately published package is required.

When developing inside TStack, edit this directory directly. TStack's `dev:boilerplate`, `dev:mobile`, `check:boilerplate`, and Storybook commands delegate here. Filtered commands in these application READMEs run from this directory, not from TStack's root. Product renaming and a generation CLI are not automated yet.
