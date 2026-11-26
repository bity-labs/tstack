# Cloudflare-only deployment with Alchemy

## Status

Accepted. Supersedes [ADR 0005](0005-node-sqlite-coolify.md) and replaces the dual-provider scope of [ADR 0002](0002-alchemy-deployment-targets.md). Reaffirms the Alchemy Better Auth integration direction of [ADR 0003](0003-alchemy-better-auth.md) for Cloudflare only. [ADR 0004](0004-deployment-lifecycle-and-security.md) remains the current lifecycle/security policy. Acceptance records the approved strategy, not successful deployment, migration or recovery evidence.

## Context

The approved final strategy is one Cloudflare deployment, not a choice between providers or an ordinary self-hosted Node application. The previous dual-provider Alchemy plan and subsequent Node/SQLite/Coolify plan remain historical records. The new decision must retain Effect contracts, pnpm/Turbo, generated Orval clients and official Better Auth browser/native clients without weakening authentication or data safety.

## Decision

- Pin Alchemy and its integration packages, including `@alchemy.run/better-auth`, to `2.0.0-beta.87`. Use Bun `1.4.4` for local development/tooling and SQLite development fixtures. Keep pnpm/Turbo for installation/orchestration, Vitest for API/web/SDK/MCP and Jest with `jest-expo` for native tests. Upgrade pinned integrations only after compatibility checks.
- Deploy the API and TanStack Start SSR as Cloudflare Workers on workerd with `nodejs_compat`, with D1 as the deployed business/auth database. Deploy website/docs as static assets on Cloudflare. Bun does not execute inside Workers; `nodejs_compat` is not a supported Node-server deployment.
- Use native Worker service bindings for deployed web→API requests, including the same-origin proxy and SSR SDK reads. Preserve request-scoped transport, cookies/origin metadata, distinct Set-Cookie, manual redirects and private/no-store. Keep local HTTP development and explicit public HTTPS API access for Expo/MCP; a missing production binding must not silently fall back to HTTP.
- Keep API-owned Better Auth through the Alchemy integration, with Better Auth owning auth schema/migrations. Keep official React and Expo clients, authoritative database sessions, stable secrets, CSRF/origin protections, rate limiting and device-scoped sign-out. Native unconfirmed logout retry remains in memory only.
- Keep business endpoints in Effect HttpApi, export OpenAPI offline and generate Orval HTTP/React Query clients. Do not put business logic/provider detection in generated SDK code or host another auth server in Start.
- Retain canonical ordered SQL in `apps/api/migrations`, data and migration histories where present, including legacy `effect_sql_migrations` and checksummed `__alchemy_migrations`. Reject edited applied SQL. SQLite→D1 requires an explicit reviewed export/import, isolated rehearsal and approved cutover; it is not automatic or transparent. D1 does not inherit local SQLite transaction/filesystem semantics.
- Support no self-hosting, Hetzner/VM, Node-server, Docker/Compose/Coolify, tunnel or SSH provisioning alternative. Local SQLite is a fixture, not a supported production target. Expo signing/EAS and a hosted authenticated MCP transport remain separate scope.
- Version non-secret deployment settings in `infra/project.ts`, including a stable distinct `project.name` (formerly `DEPLOY_NAME`). Centralize Cloudflare names as `<name>-cloudflare-<stage>-<role>` so ownership/cost is visible, for example `saas1-cloudflare-staging-api`. Explicit stages isolate environments. Changes to project/stage/resource names, especially D1/state, can create separate resources; they require identity/migration review, not a presumed safe rename. Create no unused resources. Use Better Auth's native state-backed random secret per stack/stage with a Worker secret binding, not a GitHub auth secret; preserve state/resource identity and review existing external-secret adoption separately. Local Bun retains its explicit secret.
- Ship automatic Cloudflare-only releases after full CI succeeds on the same commit: `staging` pushes deploy staging and `main` pushes deploy production, with branch-restricted `cloudflare-<stage>` environments. One-time operator activation is required; pull requests and other branches never deploy. This replaces the earlier manual-dispatch-only policy. Activation and CI are execution controls, not proof that backup/migration/acceptance prerequisites passed. Keep ordinary CI/local gates offline, including `infra:check`.
- Keep local development/checks offline. Require explicit operator approval before cloud operations, even Alchemy plan/dev or state bootstrap; approved activation covers routine branch releases only, as scoped in ADR 0004. Preserve protected state/resource identities, serialized mutation, D1 backup/export and isolated restore safety. Exact integrated infrastructure commands belong in the infrastructure README, not inferred from historical plans.

## Rationale

One provider removes parallel host/provisioning paths while retaining the existing application and client boundaries. Native service bindings avoid routing internal SSR/proxy calls over public HTTP without turning the SDK into a provider API. Separating Bun tooling from workerd execution prevents false runtime and migration assumptions.

## Consequences

Local tests need both real Bun SQLite coverage and local workerd/D1 coverage; neither alone proves live behavior. Review supported D1 transactions/batches and current Worker CPU/memory/request/subrequest and D1 query/size limits before release. Apply auth/business migrations before schema-dependent traffic and fail with no-store 503 on required storage failure.

The strict visible project-prefix requirement must be checked against beta.87's native state backend: its auxiliary resource naming is not fully exposed by the public API, and existing project-prefixed state Workers can have preserved explicit names shared across that project's stages. The infrastructure README records these limitations; this ADR does not assert complete auxiliary naming compliance. Resolve gaps explicitly before authorizing cloud execution, without renaming shared account resources or replacing state as cosmetic cleanup.

Production acceptance requires separately authorized evidence of actual routes/bindings, migration/data/secret retention, official-client auth/origin/no-store behavior and a protected export restored into isolated D1. Record recovery duration and lost writes before any approved cutover. No automatic failover, HA or zero downtime is promised. These documents authorize no cloud action and claim no successful deployment or recovery drill.

## Alternatives considered

- Restore the entire former Alchemy plan: rejected because it also restores a second provider and VM/tunnel/SSH lifecycle.
- Keep Node/Compose/Coolify: rejected by the approved Cloudflare-only direction.
- Replace pnpm/Turbo, Orval or official auth clients with Bun/provider-specific clients: rejected as unrelated to the deployment/runtime boundary.
- Transparently treat SQLite as D1: rejected because SQL execution, migrations, limits and operational recovery differ.

## Review trigger

Revisit only when pinned integration incompatibility, measured runtime/storage limits or recovery requirements justify a new explicit decision. Do not add undocumented fallback targets or weaken auth/data safeguards to make an integration pass.
