# API

Effect HTTP API with contract-first OpenAPI and Orval clients. Cloudflare Workers/D1 is the only deployment target, using Alchemy and `@alchemy.run/better-auth` at `2.0.0-beta.87`. Bun `1.4.4` runs local development/tooling and the SQLite development fixture, not deployed Workers. Workers run workerd with `nodejs_compat`; there is no supported Node-server or self-hosting target. See [ADR 0006](../../docs/adr/0006-cloudflare-only.md).

## Source and contract boundaries

`src/features/system` and `src/features/account` own their schemas, contracts and handlers. `src/contract.ts` imports only pure contract modules; runtime composition and host adapters supply storage/auth separately. Keep `bun:sqlite` and process-server imports out of Worker bundles and runtime imports out of contract generation. Canonical business SQL lives in `migrations/`; Better Auth owns auth schema/migrations. Clients never import backend implementations. See [feature architecture](../../docs/feature-architecture.md) and the [Effect guide](../../docs/stack/api-effect.md).

## Local commands

Run from the boilerplate root after installing its dependencies (`packages/boilerplate` inside TStack):

```sh
pnpm --filter @tstack/api dev
pnpm --filter @tstack/api openapi
pnpm --filter @tstack/api test
pnpm --filter @tstack/api typecheck
pnpm --filter @tstack/api build
pnpm --filter @tstack/api db:migrate
pnpm --filter @tstack/api db:backup /absolute/local.sqlite /absolute/new-backup.sqlite
pnpm --filter @tstack/api db:restore /absolute/backup.sqlite /absolute/new-isolated.sqlite
```

The database commands address deliberately selected local SQLite files, not D1. They are not deployment or remote migration commands. Vitest needs real Bun SQLite subprocess coverage and local workerd/D1 coverage; mocks and SQLite alone do not prove D1 behavior. OpenAPI export requires no running server, database or auth secret. Run `pnpm generate` at the workspace root after contract changes; do not hand-edit generated output.

`GET /health` checks storage; failures return documented no-store 503 without database details. `/openapi.json` exposes the business contract. Both are public. `GET /me` requires a valid session and returns only the public profile; missing, forged, revoked or expired credentials return 401. Unavailable storage fails closed, not as anonymous success.

## Authentication

The API owns one Better Auth service through the Alchemy integration, mounted at `/api/auth/*` in the Effect router. Keep the official React/Expo clients and official Expo server plugin; Start is a proxy, not a second auth server. Business `/me` remains in Effect/OpenAPI/Orval; auth protocol endpoints do not.

Preserve the [auth guide](../../docs/stack/auth-guide.md) contract: exact trusted web/native origins including the native `tstack://` scheme, enabled origin/CSRF checks, database-backed rate limiting, minimum 12-character passwords and Better Auth password hashing. All API responses are no-store. Browser cookies are HttpOnly and Secure under HTTPS; native cookies persist through the official SecureStore integration.

Sessions expire after seven days and can renew after one day through official session clients. Cookie session caching stays disabled so revocation is checked against the database. `/me` validates without renewal because an SSR SDK caller cannot automatically deliver cookie changes to the browser. Each device sign-in has an independent session; sign-out revokes only that session. Native failed-logout retries retain the original credential in memory only; app termination can lose the retry while the server session remains valid until expiry.

Passwordless email codes are available alongside passwords through Better Auth's native `emailOTP` plugin: six digits, five minutes, three guesses, hashed storage, one use and rotated resends. Sending and verification are throttled in the database using Cloudflare's `CF-Connecting-IP`, not untrusted `X-Forwarded-For`. A successful code sign-in proves email ownership. On first proof for an existing unverified account, Better Auth revokes old sessions and removes unproven account links/passwords; already verified accounts retain their password. See the [auth guide](../../docs/stack/auth-guide.md#email-code-access). Password recovery, MFA, social providers, organizations and account deletion have no product flows configured.

Local sending captures private JSON messages under `.local/emails` in this app's working directory; change `AUTH_EMAIL_DIRECTORY` if needed. Open the recipient's latest file privately to get the code. Never serve/log/commit those files; delete them after testing. No email leaves the machine. Deployed sending uses the restricted Cloudflare Email binding and `emailFrom` in the workspace's `infra/project.ts`; Cloudflare domain onboarding and delivery acceptance remain operator tasks. No local command automatically sends through Cloudflare.

## Configuration and deployment

For local development, copy `.env.example` to `.env` here, generate a random secret with `openssl rand -base64 32`, and set `BETTER_AUTH_SECRET` (at least 32 characters). Keep it stable and out of Git. The development script loads this file; exported shell values take precedence. Local defaults use port 4000, `DATABASE_PATH=tstack.sqlite` in the API working directory and the web origin on port 3000. The database parent directory must exist and be writable.

Cloudflare deployments instead use the Better Auth integration's native state-backed random secret; no `BETTER_AUTH_SECRET` is supplied through GitHub. Preserve Alchemy state and resource IDs to preserve the value. See the [infrastructure secret ownership guide](../../infra/README.md#better-auth-secret-ownership), including the separate adoption requirement for existing externally supplied secrets.

Use explicit `WEB_ORIGIN` and canonical `BETTER_AUTH_URL` values matching actual public/trusted origins. For a local web portal, configure its exact origin. For deployment, configure actual HTTPS origins through the [infrastructure README](../../infra/README.md), with D1 bindings and protected runtime secrets. Never derive trust from arbitrary incoming host/forwarded headers, a service-binding request URL or the local `API_URL`. Review trusted client-IP/rate-limit behavior before public exposure rather than trusting caller-supplied forwarding headers.

The deployed web Worker calls the API through a native service binding; native/MCP clients retain explicit HTTP(S) origins. Service bindings do not bypass API authorization, origin/CSRF protections or no-store. Local dev/checks remain offline. No cloud operation—not even Alchemy plan/state bootstrap—is authorized by this README. Read [deployment](../../docs/stack/deployment.md) and [operations](../../docs/stack/operations.md) before any approved release.

## Data and migrations

Append zero-padded ordered SQL files in `migrations/`; never edit applied SQL or rewrite stored checksums. Preserve data and legacy `effect_sql_migrations`/checksummed `__alchemy_migrations` histories where present. Unknown/incompatible history must fail rather than reset. Better Auth owns auth table migrations; business SQL must not recreate those tables. The initial metadata table is infrastructure, not a product domain.

Apply reviewed auth/business migrations to the intended database before healthy/schema-dependent success. Storage/migration failure returns no-store 503. Inspect actual state after errors before retrying; startup/readiness checks do not replace a reviewed migration window. D1 does not support every local SQLite execution assumption: review transaction/batch behavior and Worker/D1 limits, not WAL/filesystem recipes.

SQLite→D1 is not automatic or transparent. Review actual schema/history, D1-compatible export/import, retained auth secret and accounts/sessions; rehearse on an isolated database and obtain approval for cutover. A successful local `db:migrate` does not migrate D1 or prove valuable-data adoption.

Local snapshot tooling must use a consistent online or validated quiesced WAL-aware procedure, integrity checks, restricted output and new destinations only; restore creates an isolated fixture rather than overwriting live data. D1 production needs its own approved export/recovery procedure, independently archived backups and a successful isolated restore with schema/history/business/auth checks. These docs claim no completed deployment, migration or disaster-recovery drill.
