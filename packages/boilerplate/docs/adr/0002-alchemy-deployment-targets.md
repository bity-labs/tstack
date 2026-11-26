# Alchemy deployment targets

## Status

Historical; the original dual-provider decision was superseded by [ADR 0005](0005-node-sqlite-coolify.md), which is itself superseded by [ADR 0006: Cloudflare only](0006-cloudflare-only.md). ADR 0006 is current policy: Alchemy `2.0.0-beta.87`, Bun `1.4.4` locally, workerd/nodejs_compat Workers and D1 when deployed. It does not reinstate the Hetzner choice below. The original decision is preserved for history, not as setup instructions. No real cloud deployment validation was established by this record.

## Context

The standalone SaaS needs a reproducible deployment without changing its public API or requiring both a VM and an edge database. Local development must work without cloud provisioning. The workspace already uses pnpm/Turbo, Effect contracts, TanStack Start SSR, Expo and static Astro/Nimbus sites.

## Decision

Use Alchemy and its provider/integration packages pinned to `2.0.0-beta.87`, Effect packages at `4.1.5`, and Better Auth packages at `1.7.27`. Upgrade these integrations together after compatibility checks, not through independent floating ranges. Bun is the local and Hetzner API runtime, not a replacement for pnpm/Turbo or the existing test runners.

Select exactly one deployment target and one stage explicitly per invocation. There is no implicit production stage or fallback target. Switching targets is a separate deployment and data migration, not replication or automatic failover.

- **Hetzner**: a VM runs the Bun API and TanStack Start SSR server, with static website/docs assets served on the VM. SQLite lives on an attached persistent volume, not an ephemeral release directory. Supervised `cloudflared` routes public traffic through Cloudflare Tunnel. Network and lifecycle policy is owned by [ADR 0004](0004-deployment-lifecycle-and-security.md).
- **Cloudflare**: Workers run the API and TanStack Start SSR; D1 stores application and auth data. Website/docs are static assets. Workers use their supported runtime and D1 bindings, not Bun's file-based SQLite driver or a VM filesystem.

Keep runtime adapters behind the API's contract/runtime separation. Business operations remain Effect HttpApi contracts exported to OpenAPI and consumed through the Orval SDK. Authentication remains a separate official-client protocol, as decided in [ADR 0003](0003-alchemy-better-auth.md). The local MCP health adapter remains stdio; this decision introduces neither an MCP HTTP service nor an EAS pipeline.

## Rationale

One infrastructure model makes target differences explicit without making domain handlers depend on a provider. Hetzner offers a conventional persistent SQLite deployment; Cloudflare offers managed Workers/D1 but has different SQL and runtime constraints. Neither target requires artificial domain layers or event sourcing: domain principles apply when real business rules need them, as in [ADR 0001](0001-feature-architecture.md).

## Consequences

Provider-specific startup, persistence and build adapters require separate checks. D1 code cannot assume interactive transactions or a local SQLite filesystem. Vitest remains the API/web/SDK runner, including real Bun subprocess integration where `bun:sqlite` is required; Expo retains Jest with `jest-expo`. Node-hosted mocks alone do not establish Bun compatibility.

The former dual-provider deployment guide and infrastructure README documented commands, outputs and the local/remote validation boundary for that design. The pinned Hetzner Service launcher used Node; the API entry relaunched its code-split bundle under Bun before loading `bun:sqlite`. This historical workaround required VM lifecycle testing and review when upgrading Alchemy; it is not part of the current Cloudflare-only design.

## Alternatives considered

- One VM-only or Workers-only deployment: simpler, but does not meet the two approved deployment choices.
- Run both targets for every stage: adds cost, data ownership ambiguity and an unsupported failover promise.
- Replace pnpm/Turbo or Vitest with Bun tooling: unrelated to the runtime requirement and disruptive to existing app checks.

## Review trigger

Revisit when measured load, D1 limitations, deployment evidence or recovery requirements justify another storage/runtime model. Do not infer high availability or zero-downtime deployment from having two target definitions.
