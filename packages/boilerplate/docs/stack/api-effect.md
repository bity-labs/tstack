# Effect API

The API uses Effect HTTP, Schema, SQL, configuration and scoped resources. Alchemy and `@alchemy.run/better-auth` are pinned to `2.0.0-beta.87`. [ADR 0006](../adr/0006-cloudflare-only.md) selects Bun `1.4.4` local development/tooling with SQLite fixtures and Cloudflare Workers/D1 deployment only. Workers run workerd with `nodejs_compat`, not Bun or a Node server. See [feature architecture](../feature-architecture.md) for ownership and the [API README](../../apps/api/README.md) for local commands/configuration.

## Contract and runtime

- `src/features/*/*.schema.ts` defines input/response schemas and expected errors; shared errors stay in pure modules such as `src/lib/http-errors.ts`.
- `src/features/*/*.api.ts` defines `HttpApiGroup` and endpoints. Preserve existing URLs, operationIds and success/error schemas during refactors.
- `src/contract.ts` composes only pure feature contracts/schemas, never handlers, storage, auth initialization or infrastructure execution.
- `src/features/*/*.handlers.ts` implements groups through `HttpApiBuilder.group` with injected SQL/Auth services. A handler importing the contract does not permit the reverse import.
- Runtime composition supplies storage, Alchemy Better Auth routes and no-store middleware. Keep local Bun/process imports out of Worker bundles, and bindings out of client bundles. No frontend/MCP/SDK consumer imports backend implementations or opens the database.

Keep storage details out of business handlers. Introduce business services or persistence abstractions only when actual complexity warrants them; small system/account features do not need artificial domain/repository layers. Authentication remains API-owned with official React/Expo protocol clients, not generated auth SDK methods or another auth server in Start. Read [authentication](auth-guide.md).

## Persistence and migration boundaries

Canonical ordered business SQL lives in `apps/api/migrations` from the workspace root. Better Auth owns auth tables/migrations. Preserve accounts, sessions, business data and legacy `effect_sql_migrations`/checksummed `__alchemy_migrations` histories where present. Reject edited applied SQL, missing/out-of-order history and incompatible baselines rather than resetting history or blessing changed checksums. Do not add a duplicate baseline or rename applied SQL for style.

Local SQLite is a development fixture, not supported self-hosting. Moving valuable SQLite data into D1 requires reviewed D1-compatible export/import, history/schema/auth validation in isolation and an approved cutover with the retained secret. It is not automatic or transparent; local `db:migrate` does not reach D1. A binding/name change can select a different empty database, not move data.

Use the integrated D1 migration path before schema-dependent traffic. Do not assume interactive transactions, local WAL/filesystem access, unlimited queries/batches or long-lived processes. Review actual Worker/D1 limits and adapter transaction semantics for the pinned integration. Health and required storage/migration failures must fail with no-store 503 rather than green readiness; inspect actual state before retrying. [ADR 0004](../adr/0004-deployment-lifecycle-and-security.md) owns policy, and [operations](operations.md) covers export/isolated restore.

## Generation and verification

`pnpm generate` exports `generated/openapi.json` without a database, server, secret or cloud operation, then runs Orval. Generated output is versioned; inspect drift and never edit it manually. The SDK remains an HTTP client, with an injectable request-scoped fetch transport for native Worker service-binding calls from the web server; it does not require an Effect runtime in consumers.

Use `pnpm --filter @tstack/api test`, `typecheck` and `build` from this workspace. Vitest remains the runner; exercise real Bun SQLite subprocesses and local workerd/D1 adapters. Test fresh and retained data/history, checksum rejection, idempotent reopening, auth persistence/expiry/revocation, hostile origins and storage/readiness failure. Never test against valuable databases. Local SQLite alone does not establish D1 behavior; workerd fixtures do not establish real cloud deployment or recovery.

Use the [deployment guide](deployment.md) and [infrastructure README](../../infra/README.md) for approved release preparation. No cloud operation, including plan/dev/state bootstrap, is authorized by local checks or these docs.
