# Node SQLite and Coolify

## Status

Superseded by [ADR 0006: Cloudflare only](0006-cloudflare-only.md). This record preserves the intervening Node/SQLite/Compose/Coolify decision, which had superseded ADRs 0002 and 0003. It is not a supported deployment path or current setup guide. ADR 0004 now applies lifecycle/security policy to Workers/D1. No successful migration, deployment or recovery was established by this record.

## Context

The standalone SaaS needs an ordinary Node application stack without maintaining provider provisioning or multiple API database/runtime targets. An existing Coolify installation manages Docker Compose deployment and its GitHub integration. Coolify installation/configuration, DNS and Cloudflare Tunnel are managed separately. Effect contracts, official Better Auth clients, TanStack Start SSR, Expo and the HTTP SDK must retain their current ownership and observable behavior.

## Decision

- Use Node.js 24+ for the API, official Better Auth with `node:sqlite`, and Effect for HTTP, SQL, configuration and resource composition. Remove Alchemy adapters, Bun and Workers/D1 support rather than preserving parallel deployment paths. pnpm/Turbo remain installation/orchestration tools; Vitest and native Jest remain the test runners.
- Keep one API-owned auth service and database. Better Auth owns auth table migrations. Preserve the current auth/session contract, including official browser/native clients, stable secrets, origin/CSRF defenses, database-backed rate limiting/session checks, private/no-store responses and device-scoped sign-out. Native failed-logout retries remain in-memory only and can be lost on app termination.
- Keep business contracts in Effect HttpApi, export OpenAPI offline and generate the ordinary Orval HTTP SDK. Client applications and MCP consume HTTP, not backend services or database drivers. The web server retains SSR and the same-origin auth/business proxy.
- Ship a Dockerfile with `api`, `web`, `website` and `docs` targets plus `compose.yaml`, `.env.production.example` and a container runbook (these historical deployment files were subsequently removed under ADR 0006). The API uses port 4000 and persistent `/data/api.sqlite`; web uses port 3000 and internal `API_URL=http://api:4000`; static website/docs use port 8080. Compose publishes no host ports by default. Supply docs `SITE_URL` at build time through `DOCS_SITE_URL`.
- Deploy this Compose application through the existing Coolify installation. Do not maintain provider provisioning, a deployment workflow, Coolify setup, DNS or tunnel configuration here. Coolify owns its GitHub integration; the repository retains application CI. Public routing, TLS and host access are separate operator responsibilities, not implicit results of a local build.
- Run source development/migrations with `node --import tsx` and compiled production code with `node dist/main.js`. Auth/business migrations must complete on the actual SQLite database before the first healthy response; lazy initialization is allowed, but migration/storage failure must return 503.
- Keep canonical business SQL in `apps/api/migrations` and remove the unused TypeScript migration source. Preserve existing data and both legacy `effect_sql_migrations` and checksummed `__alchemy_migrations` histories during adoption; reject edited applied SQL. Do not reset data/history to change runtime or adapter. Local integration fixtures validate adoption; migration of a deployed database still requires a reviewed backup and release window.

The local stdio MCP adapter is not a new hosted service, and Expo releases/signing/EAS remain separate. This decision introduces no billing, tenancy, email delivery/recovery, MFA or social auth feature.

## Rationale

One Node/SQLite runtime removes provider-specific SQL and auth integration branches while preserving Effect's contract boundary and official Better Auth behavior. Compose provides a portable application package; existing Coolify and ingress management avoid duplicating provider automation and deployment workflows in the starter.

## Consequences

Node.js 24+ and real SQLite integration checks are required. Test fresh and retained databases, both historical migration registries, checksum rejection, restart preservation, storage failure and auth lifecycle behavior. Run OpenAPI generation without a database/server/secret and inspect contract drift. A local passing test or container build is not proof of a live migration, public route or disaster recovery.

SQLite remains single-host persistent storage, not replication, HA or automatic failover. Off-host consistent backups, isolated restoration and an approved migration/cutover window remain required by ADR 0004. Live Coolify routing, tunnel/TLS and restore validation remain deferred until separately authorized. See [deployment](../stack/deployment.md) and [operations](../stack/operations.md).

## Alternatives considered

- Retain Alchemy/Bun and Workers/D1 in parallel: rejected because the approved scope is one ordinary Node/SQLite stack, not multiple provider/runtime support paths.
- Keep a repository deployment workflow beside Coolify: rejected because Coolify owns its GitHub integration and release execution.
- Move auth into the web server or generate its protocol into Orval: rejected because it splits ownership or replaces official clients without a product need.
- Bundle Coolify installation and tunnel/DNS provisioning: rejected because those are managed separately, outside this application's scope.

## Review trigger

Revisit when measured storage/availability needs, Node/Better Auth compatibility or live operational evidence justify another architecture. A different database or runtime needs an explicit migration/recovery design rather than an undocumented fallback.
