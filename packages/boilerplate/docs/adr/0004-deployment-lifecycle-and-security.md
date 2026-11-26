# Deployment lifecycle and security

## Status

Accepted, revised for [ADR 0006: Cloudflare only](0006-cloudflare-only.md). This record originally governed the dual-provider Alchemy design, then the Node/Compose design in now-superseded ADR 0005. Those provider/host procedures are historical, not current policy. The secret/data/authorization safeguards remain; the current deployment is Workers/D1 only. Local fixtures do not establish live migration or recovery success.

## Context

Alchemy manages Cloudflare API/web Workers, D1 and static website/docs. Bun `1.4.4` is local development/tooling, not the Worker runtime or a supported self-hosting service. Managed persistence does not remove the need to protect state, authorize operations, preserve migration history or prove recovery.

## Decision

### Authorization, state and secrets

Local development, generation, builds and tests must not contact cloud provisioning or initialize remote state. Obtain explicit operator approval before cloud operations, including plan/dev, shared-state bootstrap, deployment, export or recovery. Approved activation of the branch workflow grants standing approval for its routine releases as described below; it does not authorize unrelated cloud operations. Credentials are not authorization; a plan can mutate state. Identify the Cloudflare account, explicit stage, stable state/resource/database identities, release revision, bindings and public origins before remote execution.

Version non-secret configuration in `infra/project.ts`, with a stable distinct `project.name` per application (formerly `DEPLOY_NAME`) and centralized visible `<name>-cloudflare-<stage>-<role>` resource names. This prefix identifies ownership/cost, while distinct application identities and explicit stages isolate resources. Name changes can create separate D1/state/resources rather than safely rename them; review actual identity, retained data/state and any required migration before changing names. Create only used resources, no unused buckets.

Use protected shared state and recovery material. Serialize every mutation for the same deployment across CI and local operators. Inspect state/provider resources after failures before retrying; do not erase state, change identity or use adoption flags to hide mismatches. Protect data-bearing resources from routine replacement/deletion. Exact commands/configuration belong in the [infrastructure README](../../infra/README.md).

Deployment automation is Cloudflare-only and, after one-time operator activation, runs automatically after the same commit's full CI succeeds: pushes to `staging` deploy staging and pushes to `main` deploy production. This revises the previous manual-dispatch-only policy. Pull requests and other branches do not deploy. Use branch-restricted `cloudflare-<stage>` environments with isolated secrets/domains and protected source branches; required environment reviewers are not part of the automatic flow. Naming an environment does not protect it. Set the repository variable `ALCHEMY_DEPLOY_ENABLED=true` only after approving bootstrap/release scope and configuring the environments. Activation covers routine apply/state bootstrap and reviewed D1 migrations, not teardown, restores or identity/data migrations. Retain stable identities/scoped secrets and serialize CLI operators with workflow execution. See the [deployment guide](../stack/deployment.md#automatic-branch-deployments) for activation details.

Secrets, database files/exports, snapshots and local environment files do not belong in Git, public assets, bundles or logs. Use Better Auth's native Alchemy random resource to generate a deployed secret once per stack/stage, persist it in protected state and bind it as a Worker secret. GitHub needs only the Cloudflare API token, not a Better Auth secret. Preserve the random resource and state across releases; existing externally supplied secrets require separately reviewed adoption before switching. Local Bun still requires its explicit stable `BETTER_AUTH_SECRET`. Rotate deliberately with assessed session impact. Protect state access/encryption recovery material separately from database backups.

### Runtime, ingress and sessions

Deployed API/web run on workerd with `nodejs_compat`. No Bun filesystem SQLite, Node server, VM, Docker/Compose/Coolify, tunnel or SSH provisioning path is supported. Use native service bindings for deployed web→API traffic. Public HTTPS web/API/auth origins remain explicit, separate from internal binding request URLs. The service binding is a transport, not permission to bypass authorization or origin/CSRF defenses.

Keep the [auth guide](../stack/auth-guide.md) contract: exact trusted web/native origins, database-backed session checks/rate limiting, request-scoped cookies, distinct Set-Cookie forwarding, private/no-store and fail-closed behavior. Keep official React/Expo clients; native failed-logout retry credentials are in-memory only. Verify actual deployed routes, bindings and runtime limits rather than assuming local success proves compatibility.

### Migrations and readiness

Canonical business SQL remains in `apps/api/migrations`; Better Auth owns auth tables and migrations through the Alchemy integration. Apply reviewed business/auth migrations to the intended D1 database before schema-dependent traffic. Do not assume interactive transactions, unlimited batch/query execution or filesystem/WAL access in D1. Review Worker/D1 limits, adapter execution semantics and code/schema compatibility before a release window.

Preserve tables, business data, accounts, sessions and legacy `effect_sql_migrations`/checksummed `__alchemy_migrations` histories where present. Reject edited applied SQL rather than replaying it, resetting history or rewriting checksums to bless changes. Inspect actual schema/history and validate retained-data adoption against an isolated copy; fixture tests are not production migration evidence.

SQLite→D1 is an explicit data migration, not an automatic/transparent adapter switch. Review export/import compatibility, auth schema/history, retained secret and cutover; rehearse in isolation and obtain approval before moving valuable data. Local `db:migrate` does not migrate D1. Required storage/migration failure must return no-store 503 rather than healthy/schema-dependent success. Inspect actual state after a failure before retrying.

### Backup, recovery and teardown

Define D1 export/recovery procedures, access controls, independent archives, retention, recovery point/time objectives and alerts before production use. Review provider recovery-window/format/size limits. D1 persistence, Alchemy state and a successful export are not proof of recoverability. Local SQLite snapshots require a consistent online or validated quiesced WAL-aware procedure; copying only a live main file is not a backup and does not produce an automatic D1 migration.

Restore into an isolated D1 database first. Verify actual account/ID separation from live, integrity, schema, migration histories, business data and application/auth behavior with the retained secret and matching application revision. Account for session validity and post-backup revocations. Only after separate approval, quiesce writes and switch bindings/traffic; record lost writes and recovery duration. Code rollback is not database rollback, and restoration can discard newer writes.

Do not destroy/replace D1 or state as rollback, cleanup or an implicit stage change. Teardown requires separate approval, an inventory of retained data/configuration/secrets/backups and a verified recovery path. Resource protection is not a nuisance to bypass after a failed apply.

## Rationale

Explicit identities and serialized operations prevent cross-stage writes and accidental empty databases. Stable secrets preserve sessions; request-scoped binding transport preserves client boundaries without public HTTP hairpins. Backup and isolated restore evidence, not managed storage alone, establish recoverability.

## Consequences

Operators must validate actual state, routes, bindings, migrations, limits and recovery. Migration windows and cutover may interrupt service; no HA, automatic failover or zero-downtime guarantee is made. [Deployment](../stack/deployment.md) and [operations](../stack/operations.md) apply this policy; neither authorizes remote execution nor asserts a successful live drill.

## Alternatives considered

- Preserve historical VM/Compose/tunnel procedures: rejected by the Cloudflare-only scope in ADR 0006.
- Treat plan as offline or credentials as approval: rejected because provider/state changes can occur.
- Reset history/regenerate secrets during adoption: rejected because it risks data loss and invalid session behavior.
- Rely only on D1 persistence or an untested export: rejected because neither proves recovery.

## Review trigger

Revisit when measured service objectives, D1/Worker limits or deployment/recovery evidence require a new decision. Relaxing safeguards requires explicit review, not a script default.
