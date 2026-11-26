# Coding standards

All paths and commands below are relative to this standalone workspace. See [feature architecture](feature-architecture.md) for ownership and [context](context.md) before introducing product terminology. Generic testing/design/review doctrine lives in [engineering](engineering/index.md); this file defines the concrete repository conventions.

## Naming

- Write custom directory and file names in kebab-case: `features/account`, `account-screen.tsx`, `auth-client.ts`. Use PascalCase for React components, types, schema classes and Effect service tags; use camelCase for functions and variables.
- Name features by their capability using consistent domain language: `authentication` for sign-in UI, `account` for the current-user profile, `system` for health. Use the same capability name in different apps when they implement that same capability; do not force matching features where an app has no implementation.
- Use `.schema.ts` for runtime schemas, `.api.ts` for an API feature's public HTTP contract, `.handlers.ts` for HTTP handlers, and `.service.ts` for business services when needed. Infer schema and SDK types rather than duplicating them in `.model.ts`; create a model only for a distinct domain representation.
- Use `.functions.ts` for TanStack `createServerFn` exports and `.server.ts` for server-only web implementations. Server functions are explicit callable bridges; a server-only module is not imported directly by browser code. Do not use Next.js `"use server"` or `"use client"` conventions here.
- Hooks start with `use`: `use-account.ts` exports `useAccount`. Use `.query.ts` only for handwritten query configuration that adds behavior; do not wrap every generated Orval hook or duplicate generated query keys.
- Components and screens use descriptive `.tsx` names such as `auth-form.tsx` and `account-screen.tsx`. Tests are `<subject>.test.ts(x)`; stories are `<component>.stories.tsx`. Do not add `.component.tsx` or a redundant `.screen.tsx` suffix.
- Keep existing framework filenames: Expo `App.tsx`, entry `index.ts`, TanStack `__root.tsx`, `_authenticated.tsx`, `api.$.ts`, and tool configuration names. TanStack and Astro route names follow their routers. Generated SDK names and `routeTree.gen.ts` follow their generators. Preserve the official Nimbus scaffold's component names.
- Keep environment names in upper snake case and existing HTTP URLs/operationIds stable during refactors. A file rename does not authorize changing `/me`, `health`, auth cookie names or the mobile scheme.

Do not create empty feature subdirectories or one-file wrappers to satisfy a naming table. Prefer a responsibility-specific module over a new `utils`, `helpers` or `common` bucket. The existing shadcn `lib/utils.ts` is a class-name helper, not a home for business logic.

## Imports and tests

- Import another feature through its explicit public entry point. Web/native `index.ts` exports only client-safe UI; API `.api.ts`, `.schema.ts` and `.handlers.ts` are separate explicit surfaces. Use relative imports inside a feature. Avoid dependency cycles and cross-feature private imports.
- Access business endpoints through `@tstack/sdk` or `@tstack/sdk/react`. Better Auth protocol calls use its official clients. No frontend, MCP tool or SDK imports API implementations or accesses SQLite.
- Colocate unit/component tests and stories with their subject. Keep assembled HTTP, SDK and MCP integration suites in `tests/`; test behavior through public interfaces. Use Vitest for API/web/SDK/MCP and Jest with `jest-expo` for native tests. Exercise real Bun `1.4.4` SQLite subprocesses for local storage/auth and local workerd/D1 for deployed adapters; mocks or SQLite alone do not prove D1 persistence or migration behavior.
- Keep generated outputs versioned, but never hand-edit them. Commit contract and generated changes together when the public contract changes. Keep local environment files, databases, caches, archives and build output out of Git.
- Preserve authentication safeguards when moving code; use the [auth guide](stack/auth-guide.md) for the lifecycle contract. Do not rename or edit committed migrations to match a cosmetic naming rule.

## Validation

Run checks from this workspace, not TStack's parent root. Targeted examples:

```sh
pnpm --filter @tstack/api test
pnpm --filter @tstack/web test
pnpm --filter @tstack/mobile test
pnpm --filter @tstack/mcp test
pnpm --filter @tstack/web build
```

For contract changes run `pnpm generate` and inspect the OpenAPI/SDK diff. For the full workspace run `pnpm check`: formatting, lint, types, offline `infra:check`, tests, builds and web Storybook. `pnpm test` uses `turbo run test --concurrency=1`; there is no static deployment-server test step. `pnpm storybook:mobile` runs the separate development-only native catalog; native exports do not prove device behavior. Validate routes/session behavior against a running local API and web server after changing SSR or route boundaries. Local gates do not authorize cloud plan/deploy/state bootstrap.

ESLint enforces the configured TypeScript rules, and types/builds validate module and framework integration. Naming and feature ownership also require review; lint is not a complete architecture checker. Generic copied harness assets are excluded from formatting to keep the imported payload unchanged.
