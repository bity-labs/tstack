# Deployment

## Status and sources of truth

[ADR 0006](../adr/0006-cloudflare-only.md) selects Cloudflare only, Alchemy `2.0.0-beta.87`, Bun `1.4.4` for local development/tooling and the Alchemy Better Auth integration. [ADR 0004](../adr/0004-deployment-lifecycle-and-security.md) owns lifecycle/security policy. ADRs 0002, 0003 and 0005 preserve historical decisions; none authorizes another deployment target.

The [infrastructure README](../../infra/README.md) owns exact configuration, CLI syntax, bindings, outputs and state setup. Inspect the integrated entry point and scripts before using those commands. This guide records requirements, not evidence of a successful deployment, data migration or recovery drill. Credentials and a successful local build are not approval. Remote operations require operator approval; explicitly activating the branch workflow below grants standing approval for its routine releases, not for unrelated cloud operations.

## Workloads and transport

- **API**: Effect HTTP contracts/handlers, API-owned Alchemy Better Auth integration and D1. The deployed Worker runs workerd with `nodejs_compat`, not Bun or a Node HTTP server.
- **Web**: TanStack Start SSR Worker, with a native service binding to the API Worker. The same-origin `/api` proxy and request-scoped SSR SDK transport use that binding without replacing the generated SDK or official auth clients.
- **Website and docs**: static assets deployed on Cloudflare. Set the real public docs `SITE_URL` before building. Static hosting does not make the authenticated SSR web app a static export.
- **Mobile**: Expo uses an explicit device-reachable HTTPS API origin with the official Expo auth client and HTTP SDK. Cloudflare infrastructure does not sign binaries or configure EAS.
- **MCP**: local stdio HTTP SDK consumer, not a hosted authenticated MCP service.

Bun `1.4.4` runs local API development/tooling and SQLite fixtures. The local web server uses `API_URL` for HTTP to that fixture. Neither is a supported self-hosting deployment; there is no VM, Node-server, Docker/Compose/Coolify, tunnel or SSH provisioning path. Production must use the configured service binding rather than silently falling back to a local/public HTTP origin when a binding is absent.

Public web/API/auth HTTPS origins are explicit configuration, separate from binding request URLs. A service binding does not replace origin/CSRF checks or per-request authorization. Preserve original cookies/origin metadata, distinct Set-Cookie headers, manual redirects, no-store and SSR request isolation. See [authentication](auth-guide.md).

## Project identity and resource names

`project.name` in `infra/project.ts` is required and stable for each application; choose distinct values for distinct applications. Centralized Cloudflare resource names use `<name>-cloudflare-<stage>-<role>` consistently, for example `saas1-cloudflare-staging-api`, `saas1-cloudflare-staging-web` and `saas1-cloudflare-staging-database`. Apply the visible project prefix to static deployments and state resources as well, so ownership and cost are attributable. Stages isolate each project's environments; neither names nor stages transfer data. Provision only resources actually used, no unused buckets.

Changing `project.name`, stage or a D1/state name can create separate resources, not safely rename existing ones. Review actual resource/state identities, data retention and any migration/cutover before changing naming configuration. Do not resolve a mismatch by deleting state or accepting a new empty database.

Verify naming against the integrated infrastructure before authorizing bootstrap. Beta.87's native state backend has auxiliary naming limitations described in the infrastructure README, and an existing project-prefixed state Worker may have a preserved explicit name shared across that project's stages. Do not claim every native backend auxiliary resource follows the stage/role scheme, rename shared account resources, or replace existing state to force compliance. Resolve any gap from the strict per-project visible-prefix requirement explicitly before cloud execution.

## Before remote execution or activating automation

1. Run offline checks for the exact revision. Confirm ordinary dev/check/generate commands cannot import infrastructure execution or bootstrap state.
2. Identify the Cloudflare account, explicit stage, stable resource names, state backend/recovery material, D1 name/ID, Worker bindings/routes and public origins. Confirm whether resources already exist before considering adoption. Protect state and serialize every mutation for the same deployment, including CLI operators and CI.
3. Obtain separate approval for any remote plan/state bootstrap. A plan/dev invocation can contact providers and create remote state; it is not an offline diff. Do not erase state, change identity or use adoption flags to hide a mismatch.
4. Review the actual diff for D1/state replacement, secret regeneration, binding/origin changes and unintended public routes. Retain the existing auth secret. Confirm scoped credentials and protected runtime secret delivery without exposing values in logs, assets or build arguments.
5. Review auth/business migrations, D1 runtime limits, code/schema compatibility and the backup/isolated-restore result. Agree on a migration/maintenance window and rollback/cutover procedure using [operations](operations.md).
6. Obtain approval for the identified resource changes and release. Execute only the reconciled infrastructure flow and record its real outputs, revision, migration outcome and subsequent acceptance evidence. A partially failed operation needs state/resource inspection before retrying.

## Migration and runtime boundaries

Canonical business SQL remains in `apps/api/migrations`; Better Auth owns auth table migrations. Apply reviewed migrations to the selected D1 database before schema-dependent traffic. Preserve `effect_sql_migrations` and checksummed `__alchemy_migrations` histories where present, and reject edits to applied SQL. An existing SQLite database does not become D1 by changing a binding or running local `db:migrate`: export/import compatibility, auth data, history, retained secrets and an isolated rehearsal need explicit review and approved cutover. No automatic or transparent SQLite→D1 migration is promised.

D1 is not a filesystem SQLite connection: do not assume WAL files, interactive transactions, unlimited batches or a long-lived process. Review supported batch/transaction behavior and current D1/Worker query, CPU, memory, request and subrequest limits for the actual account and pinned adapters. Local compatibility tests do not remove those limits. Health/storage checks must fail with no-store 503 when required storage/migrations are unavailable; do not reset history or change to an empty binding to make readiness green.

## Local verification

From the standalone workspace with dependencies, Node tooling, pnpm and Bun `1.4.4` installed:

```sh
pnpm generate
pnpm --filter @tstack/api test
pnpm --filter @tstack/api typecheck
pnpm --filter @tstack/api build
pnpm --filter @tstack/web test
pnpm --filter @tstack/web build
pnpm --filter @tstack/mobile test
pnpm infra:check
```

Run `pnpm check` for the full local gate. Keep OpenAPI generation offline without a server, database or auth secret, and inspect generated drift. Vitest retains real Bun SQLite subprocess coverage and local workerd/D1 adapter coverage; Jest with `jest-expo` covers native UI. Verify Worker builds cannot import `bun:sqlite` or Node-server entry points. These commands must not provision, plan, deploy or initialize cloud state. Exact additional offline infrastructure checks belong in the infrastructure README.

## Deferred live acceptance

Only after separate authorization, record evidence for the actual stage:

- Worker deployments, static assets, HTTPS routes, docs canonical links and SSR deep links work with the intended account/state identity and no overlapping deployer.
- The native web→API service binding is present and used by both proxy and SSR SDK reads. Missing bindings fail closed. Browser bundles contain no server binding/secrets or internal configuration.
- Auth/business migrations succeed on the intended D1 database. Redeployment retains accounts, sessions, business data, migration histories and the same secret; storage failures return 503.
- Official-client register/sign-in/renewal/sign-out, `/me`, hostile-origin rejection, distinct Set-Cookie forwarding, request isolation and private/no-store work through public HTTPS. Verify separate device sessions and native in-memory-only logout retry limits.
- Cloudflare Email Service is enabled for the selected account/domain and `project.emailFrom`; native sending, SPF/DKIM/DMARC setup, verified-recipient/free versus paid arbitrary-recipient entitlement, failure handling and actual inbox delivery are checked. Verify code signup/sign-in, resend/expiry/one-use, existing unverified-account cleanup, and distinct client-IP quotas through the real web→API binding. Offline capture and fake delivery do not prove provider acceptance or deliverability.
- Actual workerd/nodejs_compat behavior, D1 execution limits and operational logs are checked, not inferred from Bun SQLite tests.
- A protected D1 export/recovery point restores into an isolated database and passes integrity/schema/history/business/auth checks before any approved binding/traffic cutover. Record interruption, recovery duration and lost writes.

No cloud deployment, existing-data migration or restore drill is claimed complete by these documents. There is no HA, automatic failover or zero-downtime guarantee. Deployment automation details must match the integrated infrastructure/workflows, not historical multi-provider instructions.

## Automatic branch deployments

The standalone [.github/workflows/ci.yml](../../.github/workflows/ci.yml) calls the reusable [deployment workflow](../../.github/workflows/deploy.yml) only after its full `check` job succeeds for the same commit:

- Push to `staging` → Alchemy stage `staging`, GitHub environment `cloudflare-staging`.
- Push to `main` → Alchemy stage `production`, GitHub environment `cloudflare-production`.
- Pull requests and all other branches run CI without deployment. There is no manual dispatch or stage selector.

Inside TStack these nested workflows are distributed source, not active TStack deployments. GitHub discovers them only after copying the boilerplate, including both workflow files, to a standalone repository root.

### One-time activation

1. Create GitHub environments `cloudflare-staging` and `cloudflare-production`. Restrict their deployment branches to `staging` and `main`, respectively. Protect the branches with pull-request review and required CI checks. For fully automatic releases, do not configure required environment reviewers or wait timers; existing GitHub rules can otherwise pause a run. An environment name alone does not configure protection.
2. Customize and commit `infra/project.ts`: project name, account/zone IDs, zone, state Worker name, sender and per-stage domains. The example IDs are intentionally empty and fail validation until configured; GitHub variables no longer supply these values. In each environment, configure only secret `CLOUDFLARE_API_TOKEN`, or grant the repository access to an organization secret of that name. Better Auth's native Alchemy integration generates and retains a separate secret in each stage's state, then injects a Worker secret binding; do not configure `BETTER_AUTH_SECRET` in GitHub. Keep state/resource identities stable. Existing externally supplied secrets require a separately reviewed adoption before switching; this is not automatic. See the infrastructure README's [secret ownership](../../infra/README.md#better-auth-secret-ownership).
3. Review and approve the initial state/bootstrap scope, migrations, backup/recovery prerequisites and expected costs. Set the **repository variable** `ALCHEMY_DEPLOY_ENABLED=true` only after this setup. This flag is evaluated before the environment is selected, so an environment-level flag will not enable deployment. Leave it unset or set it to `false` to skip future deployment jobs (this does not stop an apply already running).

Activation authorizes routine branch-triggered releases, including initial state bootstrap and reviewed D1 migrations, without a separate manual launch or approval on every push. Installing/copying the workspace does not create environments, secrets or branch protection and does not activate deployments. Local CLI operations, teardown, restores and identity/data migrations still require separate approval. Promotion means merging reviewed code from `staging` into `main`; it does not copy staging data to production.

The reusable workflow rejects branch/stage mismatches. Every run checks out its triggering commit; a failed CI job skips deployment. Concurrency serializes each stage without cancelling an active apply. GitHub may replace a pending run with a newer one, so this is not a promise to deploy every intermediate commit. Operators must also serialize external CLI mutations. Inspect state/resources after a failed apply before rerunning it. Record run URL/revision, actual resource/database identities and deferred acceptance results; a green job alone does not establish auth, data retention or recovery. Exact deployment CLI syntax remains owned by the infrastructure README/workflow.

Cloudflare Access in front of staging is separate from this automation and is not provisioned by these workflows.
