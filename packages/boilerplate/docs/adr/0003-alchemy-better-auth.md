# Alchemy Better Auth integration

## Status

Historical scope; superseded first by [ADR 0005](0005-node-sqlite-coolify.md), then reaffirmed for Cloudflare only by the current [ADR 0006](0006-cloudflare-only.md). Use the Alchemy Better Auth integration at `2.0.0-beta.87`, Bun `1.4.4` for local fixtures and workerd/nodejs_compat with D1 when deployed; the original Hetzner storage option below is not supported. The original decision is preserved for history, not as current setup instructions. Local Bun/SQLite and workerd/D1 checks do not establish real cloud auth behavior. The [auth guide](../stack/auth-guide.md) remains the current lifecycle contract.

## Context

The existing API owns Better Auth, SQLite auth tables and independent browser/native sessions. Moving to Bun and adding D1 must preserve those observable safeguards rather than create a second auth server or replace the official clients.

## Decision

Use `@alchemy.run/better-auth` at `2.0.0-beta.87` for the Effect/Alchemy server integration with Better Auth and `@better-auth/expo` at `1.7.27`, alongside Effect `4.1.5`. Keep a single API-owned auth service composed with the target's database adapter: Bun SQLite locally/on Hetzner and D1 on Cloudflare. Do not assume an API exposed by another Alchemy beta works with this pin.

The API owns the runtime and auth configuration. Better Auth owns its auth table schema and migrations; business migrations do not recreate or independently evolve those tables. Preserve existing database data, migration history and the deployed auth secret when adopting the integration. Migration and recovery policy is defined in [ADR 0004](0004-deployment-lifecycle-and-security.md).

Browser and native applications keep the official React and Expo Better Auth clients. TanStack Start relays auth requests/cookies but does not host another auth instance. Business endpoints, including `GET /me`, remain in Effect HttpApi/OpenAPI and the generated Orval SDK. Auth protocol endpoints are not regenerated as business SDK methods.

Preserve the existing lifecycle contract in the [auth guide](../stack/auth-guide.md), including origin/CSRF defenses, exact trusted origins, database-backed rate limiting, password policy, authoritative database sessions, private/no-store responses and device-scoped sign-out. This integration does not add verification mail, recovery, MFA, roles, tenancy, social providers or global logout.

## Rationale

An integration aligned with Alchemy/Effect provides a common service boundary while keeping Better Auth as the protocol and schema authority. Keeping official clients avoids a custom cookie/session protocol. This is a backend integration change, not permission to weaken existing safeguards or expand auth scope.

## Consequences

Both storage adapters need behavior tests, including upgrade preservation, storage failure, session expiry/revocation and cookie forwarding. D1 must not rely on interactive transactions; the adapter and migration path must be validated against its supported execution model. A successful local SQLite test does not prove D1 behavior.

The native logout retry credential remains in memory only. App termination can lose the retry while the server session remains valid until expiry; this decision does not promise durable revocation retries.

## Alternatives considered

- Retain only the direct Node SQLite integration: does not provide the approved Bun/D1 integration boundary.
- Host Better Auth in the web server: splits ownership and complicates native access.
- Replace official clients or generate auth into Orval: creates a second protocol implementation without a product need.

## Review trigger

Revisit if the pinned integration cannot preserve the existing auth behavior on either target, or a concrete product requirement introduces a new lifecycle feature. Stop and resolve that incompatibility rather than silently disabling safeguards.
