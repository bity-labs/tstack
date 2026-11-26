# Feature architecture

The API, web and native applications organize behavior under `src/features/<feature-name>`. Routes, entry points and shared technical integrations compose these modules. See [ADR 0001](adr/0001-feature-architecture.md) for the decision and [coding standards](coding-standards.md) for naming.

## Existing capabilities

- API `features/system` owns the health schema/contract/handler; `features/account` owns the safe profile schema/contract/handler. Public contract entry points are `<feature>.api.ts`, schemas are `<feature>.schema.ts`, and runtime handlers are `<feature>.handlers.ts`.
- Web `features/authentication` owns `AuthForm`; `features/account` owns `AccountScreen`; `features/system` owns `ApiStatus`. Each exposes client-safe components through `index.ts`.
- Native `features/authentication` owns its own `AuthScreen`, exposed through `index.ts`. It does not import DOM components. Shared native presentation remains in native `src/components`.
- MCP `src/tools/api-health.tool.ts` adapts the SDK health call to the MCP protocol; `server.ts` registers tools and `main.ts` starts stdio.

Create only the files a capability needs. Small API features have schema, contract and handler files, not empty `services`, `models`, `repositories` or `queries` folders. Frontend component groups can use `components/` or `screens/`. Split further only when navigation or ownership benefits.

## Dependency boundaries

- Root API `contract.ts` imports only feature contracts/schemas and shared pure error schemas. It must remain importable without secrets, HTTP startup, Better Auth runtime or SQLite. `server.ts` composes runtime handlers; `main.ts` supplies process configuration and layers.
- API auth composition owns one Better Auth service/layer through the Alchemy integration; database composition owns Bun SQLite development fixtures and deployed D1 adapters; `src/lib/http-errors.ts` holds a shared transport error. Canonical ordered business SQL stays together in `apps/api/migrations` from the workspace root; Better Auth owns auth table migrations. Preserve legacy `effect_sql_migrations` and checksummed `__alchemy_migrations` histories where present and reject edited applied SQL. SQLite→D1 requires explicit migration review, not a transparent switch. Storage is a technical integration, not a business feature. See [ADR 0006](adr/0006-cloudflare-only.md).
- An API service may use injected Effect SQL directly. Introduce a separate repository only when persistence complexity or alternative implementations justify it. Add an Effect service/layer for business behavior when handlers would otherwise contain substantial policy; `/health` needs none.
- Web/native UI imports another feature through its `index.ts`, not `components/*` internals. API composition uses explicit `.api.ts` and `.handlers.ts` surfaces so importing a contract never starts its implementation. Do not build a universal barrel mixing server code and client components.
- Web server bridges, browser/native Better Auth clients and transport configuration stay outside business features in `src/lib`. Route modules do session guards, loaders, metadata and UI composition; they do not access business SQL.
- Cross-application business communication uses the SDK. Shared domain terminology does not justify importing an API service, a web React component or the API's schema classes into Expo.
- Preserve domain modeling principles where actual rules require them; no mandatory `Domain` package, aggregate layer, event sourcing or domain-event pipeline is imposed on small capabilities.
- Put generic web primitives in `src/components/ui` and reusable browser components in `src/components`. Put feature-specific UI in its feature. Keep native and DOM catalogs independent.

Content-only Astro/Nimbus apps retain framework/content-driven organization. Do not create empty feature directories in them or rename upstream scaffold components. Generated SDK code stays in `packages/sdk/src/generated` and TanStack's route tree stays generated.

## Adding a capability

The following names illustrate a future **Projects** capability; no Projects endpoint, migration, screen or MCP tool is implemented by this scaffold.

1. Define API `features/projects/project.schema.ts` and public `projects.api.ts`, compose the group in `contract.ts`, and implement `projects.handlers.ts`. If the use case needs business policy, add `projects.service.ts` and a behavioral `projects.service.test.ts`. A persistence change gets the next global migration; a trivial handler does not require a repository.
2. Run `pnpm generate`; consume resulting functions/models from `@tstack/sdk` and generated hooks from `@tstack/sdk/react`. Do not hand-create SDK DTOs.
3. Add web `features/projects/components/project-list.tsx` and `create-project-form.tsx` with an explicit public `index.ts`. Colocate `.test.tsx` and `.stories.tsx` where they cover real behavior/states. A thin `_authenticated.projects.tsx` route would map to `/projects`.
4. Use a TanStack loader for read orchestration and generated SDK mutations for writes. Add `projects.functions.ts` only if SSR needs a request-aware web-server bridge. Avoid wrapping an SDK method just to satisfy the folder structure.
5. Add an independent native `features/projects/screens/project-list-screen.tsx`, Jest tests and native stories only if the feature is needed on mobile. Do not add a navigation framework without navigation requirements.
6. A future `list-projects.tool.ts` would use the SDK, not SQLite. Design authenticated MCP access before exposing private user operations; the current stdio server has only public health access.

The same module owns its feature-specific validation and business terminology. Keep UI copy near its feature; extract genuinely shared copy only when shared. A global locale registry and localization library are not requirements of this scaffold.
