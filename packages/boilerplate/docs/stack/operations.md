# Operations

This checklist applies [ADR 0004](../adr/0004-deployment-lifecycle-and-security.md) to the Cloudflare-only strategy in [ADR 0006](../adr/0006-cloudflare-only.md). Read [deployment](deployment.md) and the [infrastructure README](../../infra/README.md) for reconciled configuration, command syntax, bindings and outputs. No cloud operation is authorized by this runbook, including plan/state bootstrap, D1 export or recovery. Live deployment, migration adoption and recovery validation remain deferred.

## Release and migration review

1. Record the Cloudflare account, required stable `project.name` from `infra/project.ts`, explicit stage, state identity, release revision, D1 name/ID, Worker binding identities, public origins and approved window. Match visible resource names to the centralized `<name>-cloudflare-<stage>-<role>` prefix for project ownership/cost. Distinct applications need distinct identities; stages isolate environments. Name changes, especially D1/state, require identity/migration review because they can create separate resources. Serialize releases/migrations across all operators and automation, including automatic releases after successful CI on `staging`/`main` through branch-restricted `cloudflare-<stage>` environments. Review migrations before merging; workflow activation grants standing approval only for routine branch releases, not recovery or teardown.
2. Check backup timestamp, independent access-controlled archive location, integrity and last isolated restore result. Define retention, recovery point/time objectives and failure alerts; D1 persistence alone is not a backup policy.
3. Review auth/business SQL and resource changes. Retain the deployed Better Auth secret through its native `BetterAuthSecret` random resource and protected Alchemy state, plus stable D1 identities and migration histories. Existing externally supplied secrets need separately reviewed adoption; never silently replace them. Reject edited applied SQL. Review D1-compatible execution, limits, code/schema compatibility and a fallback before proceeding.
4. Apply migrations to the actual selected D1 database through the reviewed infrastructure flow before schema-dependent traffic. Better Auth owns auth migrations. Record versions/outcomes; inspect real state after a failure before retrying. Do not mark a release ready solely because a Worker was uploaded.
5. Verify health, binding-backed SSR/proxy requests, official-client auth, no-store/cookie forwarding, static assets and public routing. Record interruption and evidence. Code rollback is separate from data restore; do not automatically downgrade schema or overwrite newer writes.

## D1 export and isolated restore

These are separately approved remote operations. Use the exact export/import or provider recovery commands from the integrated infrastructure runbook after verifying the installed CLI version. Do not infer current syntax, remote database identity or successful backup evidence from an old ADR or a local test.

1. Match the account, stage and live D1 name/ID against actual deployment outputs. Select a consistent D1-compatible export/recovery procedure, its consistency boundary and interruption requirements. Review provider recovery/time-travel availability, retention and account limits before promising a recovery window.
2. Export to a new restricted-access destination. Keep SQL exports out of Git, public assets, logs and ordinary build artifacts; they contain personal/auth/session data. Record timestamp, database ID, revision, schema/migration versions and checksum without printing contents or secrets.
3. Archive a verified recoverable copy independently of the deployment/state tooling with access controls and retention. A file left only in the current working environment is not completion. Check that the export format can be imported into D1; a generic SQLite CLI dump is not automatically D1-compatible.
4. Provision/select a separate empty recovery database only after approval. Verify its actual account/ID differs from live, not merely its display name. Import or recover there, never into the live binding or over a destination containing valuable data.
5. Validate integrity, foreign keys, schema, all relevant migration registries/checksums, retained business/auth data and the matching application's behavior through an isolated Worker binding. Retain the original auth secret. Exercise existing-account sign-in, `/me`, session validation/revocation and storage failure before a cutover is considered.

An export command's success does not prove restoration. Local workerd tests do not prove remote D1 recovery. If provider tooling requires a different export/recovery path, review that path rather than applying a local filesystem SQLite recipe to D1.

## SQLite development fixtures and migration to D1

Bun `1.4.4` local SQLite is a development fixture, not a self-hosting target. For a disposable local backup rehearsal, the API's `db:backup SOURCE NEWDEST` and `db:restore SOURCE NEWDEST` scripts operate only on deliberately selected local files. Verify their integrated definitions and safeguards: consistent online snapshot or validated quiesced WAL-aware procedure, integrity checks, owner-only output and refusal to overwrite an existing destination. Copying only the live main database file or deleting WAL sidecars is not safe backup.

These scripts do not export, restore or migrate remote D1. Moving valuable SQLite data to D1 requires a reviewed export/import transformation and a separately approved rehearsal/cutover. Preserve accounts, sessions, business data, stable secret, legacy `effect_sql_migrations` and checksummed `__alchemy_migrations` histories where present; inspect actual source schema/history rather than assuming compatibility. Reject changed applied SQL, incompatible histories and unsupported SQL instead of resetting data/history. SQLite→D1 is neither automatic nor transparent.

## Restore drill and incident recovery

1. Select the recovery point for the explicit stage/account/database. Record expected data loss and obtain approval before replacing any live data. Keep the current database intact for investigation.
2. Restore into an isolated D1 database and run the checks above with the matching application revision before considering forward migrations. Restored sessions reflect the recovery point: revocations made after the backup might not survive. Do not claim durable native logout retries across app termination.
3. Quiesce live writes for the approved cutover; confirm state/resource identities, change the application binding through the reviewed provider flow and verify public HTTPS/auth before admitting normal traffic. Avoid accidental concurrent writes to old and new databases.
4. Record actual recovery duration, recovery point, lost writes and verification results. Retain the pre-restore database until incident review permits disposal. A code rollback does not restore a database; a restore does not reconcile post-backup writes.

## Incident checks

- **API unavailable / 503**: inspect Worker deployment/logs, D1 bindings, provider health, limits and migration outcomes. Preserve database/history; do not select an empty database or disable readiness checks.
- **Web unavailable**: inspect SSR logs, service-binding identity/availability, API readiness and Worker compatibility. Do not replace a missing production binding with an implicit local/public HTTP fallback.
- **Public routing unavailable**: inspect Cloudflare routes/domains and TLS for the intended stage. Do not introduce a VM, tunnel, direct Node server or relaxed auth origins as a fallback.
- **Auth failure**: distinguish expired/revoked credentials, cookie/origin forwarding, mismatched secrets and unavailable storage. Preserve fail-closed/no-store. Native unconfirmed logout credentials are in memory only; restarting the app does not prove server revocation.
- **Failed infrastructure operation**: inspect provider resources and shared state before retrying; an operation may have partially succeeded. Never delete state, recreate D1 or regenerate secrets to force a clean start.

## Teardown

Treat teardown as separate destructive work, not release cleanup. Inventory Workers, routes/static deployments, D1, state, secrets and independent backups from actual outputs; identify what must be retained. Obtain explicit approval and a verified recovery path before any reviewed protection/policy change or deletion/replacement of data-bearing resources. Verify retained data and recovery access afterward. Neither a failed release nor an environment rename authorizes teardown.
