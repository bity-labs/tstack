# Cloudflare infrastructure

This directory and `../alchemy.run.ts` are self-contained in the standalone SaaS
workspace. Cloudflare is the only deployment platform. Alchemy and its provider,
SQL and Better Auth packages are pinned to **2.0.0-beta.87**; Effect is **4.1.5**.
Local API development uses Bun and SQLite; production uses Workers and D1.

**No cloud deployment or recovery has been verified.** Do not run Alchemy plan,
dev, deploy, destroy or state bootstrap as an offline check. Even **plan can
bootstrap or upgrade the remote state Worker**, creating resources and charges.
Remote operations require operator approval. Approved activation of the
[branch workflow](../docs/stack/deployment.md#automatic-branch-deployments) grants
standing approval for routine CI-gated releases, including initial bootstrap and
reviewed D1 migrations. Local CLI operations, exports, recovery and teardown still
need separate approval. Never run these in application dev/test/build or
pull-request checks. Serialize all mutations per project and stage.

## Configuration and immutable project ownership

Edit and commit [`project.ts`](project.ts) for each new project. This is the single
source of non-secret configuration for CLI and CI; GitHub environment variables
and ignored legacy `infra/.env.<stage>` files no longer override these values.
The distributed example leaves account/zone IDs empty so unconfigured projects
fail validation before loading providers. Do not put credentials in this file.

| Field in `project.ts`       | Required value                                                                                                                                                                          |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`                      | Stable project identity: lowercase letter, then up to 23 lowercase letters, digits or hyphens. Replaces `DEPLOY_NAME`.                                                                  |
| `accountId`                 | Explicit 32-character lowercase hexadecimal Cloudflare account ID. The selected provider profile must use this account.                                                                 |
| `zoneId`                    | Existing Cloudflare zone ID, in the same format and account.                                                                                                                            |
| `zone`                      | Existing lowercase DNS zone hostname, such as `example.com`.                                                                                                                            |
| `stateWorker`               | Stable project-owned name starting with `<name>-` and a nonempty suffix; at most 54 lowercase letters, digits, hyphens or underscores. Preserve an existing state Worker name verbatim. |
| `emailFrom`                 | Plain sender address in this zone/subdomain, e.g. `signin@example.com`. Complete Cloudflare Email Service onboarding first.                                                             |
| `stages.staging.domains`    | Four distinct zone hostnames under keys `web`, `api`, `website`, `docs`. No URL schemes, paths, ports, wildcards or trailing dots.                                                      |
| `stages.production.domains` | Production hostnames under the same four keys; use different hostnames from staging.                                                                                                    |

Export only `DEPLOY_STAGE` (`staging` or `production`, matching Alchemy `--stage`)
and `CLOUDFLARE_API_TOKEN` for an approved CLI operation, or use an approved
provider profile. `infra/.env.example` describes these inputs; it is not loaded
automatically. The entry point supplies the native provider's account selector
from `project.accountId`. There is no default stage or preview-stage automation.

### Better Auth secret ownership

The deployed API omits an explicit secret, using the pinned Better Auth
integration's native `Alchemy.Random` default (`BetterAuthSecret` logical ID).
It generates 32 random bytes once, retains the redacted value in Alchemy state
and binds it to the API Worker as `secret_text`. No deployed `BETTER_AUTH_SECRET`
environment variable or GitHub secret is needed. Each stack/stage has its own
value, even when both use the same state Worker. Preserve the stack, stage,
resource ID and encrypted state/recovery material; deleting/replacing state or
the random resource can generate a different secret and invalidate sessions.
Do not print/export the value as a stack output. Ordinary Bun development still
uses an explicit stable `BETTER_AUTH_SECRET` in `apps/api/.env`, without Alchemy.

**Existing deployments with an externally supplied secret:** this change does
not adopt that value automatically. Before applying it to a valuable existing
installation, keep the explicit-secret implementation and perform a separately
reviewed, state-preserving secret adoption. Removing the GitHub secret or
switching to a new random value is not a session-preserving migration. Likewise,
copy existing resource identities exactly into `project.ts` before deployment;
do not deploy the example identities over an existing installation.

The pure validator runs before provider imports; the state layer checks stage and
provider account identity **before resolving the remote backend**. Validation
does not prove credentials, zone ownership, DNS availability or provider quotas.
Use scoped Cloudflare credentials/profiles and protect their recovery material.

All application resource names come from `topology(config)`:

| Role                  | Example for project `saas1`, staging                |
| --------------------- | --------------------------------------------------- |
| Stack                 | `saas1-cloudflare-staging`                          |
| API Worker            | `saas1-cloudflare-staging-api`                      |
| D1 database           | `saas1-cloudflare-staging-database`                 |
| Web SSR Worker        | `saas1-cloudflare-staging-web`                      |
| Static website Worker | `saas1-cloudflare-staging-website`                  |
| Static docs Worker    | `saas1-cloudflare-staging-docs`                     |
| State Worker          | Explicit existing value, e.g. `saas1-alchemy-state` |

Project `saas2` gets only `saas2-` application names. Staging and production
application resources are disjoint; the explicitly configured state Worker may
be shared between those stages of the **same project**. No unused buckets are
created. Names do not depend on domains. The historical `-cloudflare-` segment
and logical IDs `Api`, `Database`, `Web`, `Website`, `Docs` are preserved to avoid
replacing an existing Cloudflare deployment. A 24-character project name plus
the longest stage/role suffix produces a 55-character name, below the 63-character
Worker/D1 naming ceiling; state uses the pin's stricter 54-character preview cap.

**Do not rename `project.name`, D1 or state to tidy up labels.** Changing project,
stage, account or state-worker identity is not adoption or migration, may select
different state, and can create resources rather than discover the old ones.
The validator intentionally rejects a legacy arbitrary state name without the
project prefix. Do not “fix” that by changing the environment to a new name:
stop and separately review a state-preserving adoption/migration procedure.
Prefixed existing state-worker values are used verbatim, never rewritten.

**Native state naming limitation:** beta.87 uses an account-wide Secrets Store
(reusing the existing store, or creating `default_secrets_store`) and generates
Durable Object/internal state bindings. Its public state API does not expose a
project-specific Secrets Store name. Thus every application resource and the
state Worker visibly has the project prefix, but strict naming of _every native
backend auxiliary resource_ cannot be promised. State secret names derive from
the explicit Worker name; the pin also detects normalized secret-name collisions.
Do not rename the shared account store or fork the backend as routine cleanup.

## Stack and runtime contracts

- `cloudflare-api.ts` defines an Effect-native API Worker and protected D1.
  `RemovalPolicy.protect()` prevents D1 replacement/deletion, not SQL mutation,
  data loss from a migration, or manual provider-side deletion.
- Business SQL uses `D1Layer`; `D1.Database.migrations` points to the canonical
  `apps/api/migrations`. Better Auth uses `CloudflareD1` with `migrate: true`:
  its schema action runs at deploy time, not in an HTTP request.
- The API forces the per-execution Better Auth instance's `$context` to initialize
  before routing, including health checks. Initialization defects return a
  generic **503** with `Cache-Control: no-store`, without exception details.
  `/health` still queries storage and fails closed on database failure. This is
  not a guarantee that every future auth operation or migration will succeed.
- `Website.Vite` deploys TanStack Start SSR from `apps/web/src/server.ts` with
  native service binding `API` and public `API_URL`. Both API and web enable
  `nodejs_compat`. Read bindings from each request's environment; do not share
  request-mutated global bindings.
- Website and docs are separate static builds (`pnpm build`, output `dist`).
  Docs receive deployed `SITE_URL`; missing assets return real 404s. All four
  apps use native custom domains, with Workers.dev and preview URLs disabled.
  The native state backend has its own authenticated endpoint and preview policy.
- Secret delivery uses the native Better Auth `Alchemy.Random` output. In this pin,
  Alchemy captures its redacted output into a Worker `secret_text` binding.
  Do not move secrets into plain resource props, Vite
  variables, public config, logs or committed environment files. State is
  authenticated and encrypted, outside this application's destroy lifecycle.

## Commands and remote approval boundary

### Authentication email delivery

The API owns an Alchemy `Email.SendEmail('AuthEmail')` descriptor restricted to `project.emailFrom`, uses the native `Email.Send` client, and installs `Email.SendBinding`. It attaches a `send_email` binding to the API Worker; it does not create an unrelated mail server, bucket or separately named cloud resource. Better Auth owns code generation, hashing, expiry and verification. Sending is awaited so rejection is not reported as successful delivery. There are no SMTP/IMAP credentials and no custom crypto implementation.

Cloudflare **Email Sending** requires account/domain onboarding and appropriate provider permissions, independently of the application's DNS routes. Free sending is limited to verified destination addresses; arbitrary SaaS users require the Workers Paid sending entitlement/quotas. Check current [Email Service setup](https://developers.cloudflare.com/email-service/get-started/) and [pricing](https://developers.cloudflare.com/email-service/platform/pricing/). This stack does not automatically enable paid sending, verify recipients or configure domain-authentication DNS. Operator approval is required before those changes or sending real messages. Configure `project.emailFrom` in the versioned project file.

Ordinary local `pnpm dev` captures emails privately to disk, not through Cloudflare. Offline tests substitute only the outbound email boundary and use real local SQLite/workerd/D1 for auth; they do not prove native send binding acceptance, DNS authentication, provider limits or inbox delivery. Do not run `alchemy dev` just to inspect a local code: it can bootstrap remote state. See the [auth guide](../docs/stack/auth-guide.md#email-code-access).

### Offline and approved remote commands

Run offline checks from the standalone workspace (`packages/boilerplate` here):

```sh
pnpm exec tsc -p infra/tsconfig.json
pnpm exec vitest run infra
pnpm exec prettier --check alchemy.run.ts infra
```

Configuration tests import only the pure config/topology module and Effect
Schema, never providers or `alchemy.run.ts`. They exercise required inputs,
Cloudflare-only configuration, origins, stable resource identities, two-project
prefix isolation, stage separation, state collisions and account/stage mismatch.
These checks do not initialize state or prove deployment/provider behavior.

Only after separate approval, review `infra/project.ts`, the selected stage and installed
provider profile, then use these actual CLI entry points from that same workspace:

```sh
pnpm exec alchemy plan --stage "$DEPLOY_STAGE"
pnpm exec alchemy deploy --stage "$DEPLOY_STAGE"
```

These examples are **not permission to execute**. The first command can bootstrap
remote state. Review all proposed changes, including identities, custom domains,
data migrations and unexpected replacements, before approving deployment. Protect
the shared state's access token/encryption key; state teardown is not cleanup.
Outputs include public `web`, `api`, `website`, `docs` HTTPS origins and
`operations.databaseId`, `databaseName`, `stateWorker` for operator verification.

## D1 migrations, export and recovery limitations

Alchemy owns production business migrations from `apps/api/migrations` and the
checksummed `__alchemy_migrations` history. Append ordered SQL; do not edit/delete
applied SQL, reset history, or run a second production migration runner. The pin
can perform one-way adoption of supported pre-existing migration histories;
confirm actual tables/checksums before approving an adoption. Keep legacy history
and Better Auth's tables intact. There is no automatic down migration or rollback
of a deployment that has already changed data. Review SQL for D1 compatibility.

**There is no automatic cross-storage migration.** Local Bun SQLite snapshots,
SQL exports, D1 databases and Alchemy state are different assets. Changing identity
or deploying this stack does not copy a local SQLite database into D1 or transfer
an old installation's auth/business data. Design and verify any transfer separately.

After separate remote-read/export approval, the pinned operator CLI can export a
D1 database by its output name. Use a new access-controlled filename outside Git;
the SQL contains personal data, sessions and migration history:

```sh
: "${D1_DATABASE_NAME:?Copy operations.databaseName}"
: "${D1_EXPORT_PATH:?Choose a new protected SQL filename}"
test ! -e "$D1_EXPORT_PATH" &&
  pnpm dlx wrangler@4.166.0 d1 export "$D1_DATABASE_NAME" --remote --output "$D1_EXPORT_PATH"
```

Verify the selected Cloudflare account and database ID against outputs before
running this command; Wrangler credentials must point to the same account.
Alchemy's removal protection does not apply to direct Wrangler operations.

An export is not a proven backup until imported and validated in a separately
approved, empty, isolated D1 database. A separately approved import uses SQL text,
not a binary `.sqlite` file:

```sh
: "${ISOLATED_D1_NAME:?Set the approved empty recovery database name, never live}"
: "${D1_EXPORT_PATH:?Set the reviewed SQL export path}"
test "$ISOLATED_D1_NAME" != "$D1_DATABASE_NAME" &&
  pnpm dlx wrangler@4.166.0 d1 execute "$ISOLATED_D1_NAME" --remote --file "$D1_EXPORT_PATH"
```

This is a database write, not a safe preview; it needs **separate recovery
approval**, even for a test database. No recovery database is provisioned by this
stack. Check schema, business row counts, foreign keys, migration checksums,
sign-in/session behavior and data integrity before any live cutover. Preserve the
auth secret. Export/import may have provider size, SQL, locking and consistency
limitations; inspect current D1 behavior for the data in question rather than
assuming SQLite file-backup semantics.

D1 Time Travel/restore is a separate provider operation with plan-dependent
retention and bookmarks. No retention, point-in-time restore, backup scheduler,
off-account destination or disaster-recovery SLA is configured or verified here.
Do not run a live Time Travel restore without an independently approved maintenance
procedure, stopped/controlled writers, a preserved current export and explicit
data-loss review. Restoring D1 does not restore Alchemy state, and restoring state
does not restore D1 data. Keep state, database exports and secret recovery material
under an access-controlled recovery plan; test it before claiming recovery works.
