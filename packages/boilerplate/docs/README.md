# Technical documentation

These files guide work on the standalone SaaS repository. They are separate from `apps/docs`, which is the public product documentation built with Nimbus.

## Project-owned references

- [Context](context.md): actual starter capabilities, domain vocabulary and limits; customize it when the product is defined.
- [Coding standards](coding-standards.md): file naming, tests and validation commands.
- [Feature architecture](feature-architecture.md): module ownership, public imports and examples.
- [Effect API](stack/api-effect.md): contracts, Bun local fixtures, Worker/D1 runtime and SDK generation.
- [TanStack Start](stack/web-tanstack-start.md): routing, session guards, SSR and client mutations. This is not a Next.js application.
- [Expo](stack/mobile-expo.md): native features, clients, tests and Storybook.
- [Authentication](stack/auth-guide.md): API-owned Better Auth and existing session invariants.
- [Deployment](stack/deployment.md): Cloudflare-only boundaries, integration prerequisites and deferred live validation.
- [Operations](stack/operations.md): release review, backup/restore and incident checklists.
- [Architecture decisions](adr/): durable decisions and the template for new records.

## Deployment decisions

- [0006: Cloudflare only](adr/0006-cloudflare-only.md) owns the current Alchemy `2.0.0-beta.87`, Bun `1.4.4` local tooling, Alchemy Better Auth, Workers/D1/static assets and native service-binding decision.
- [0004: Deployment lifecycle and security](adr/0004-deployment-lifecycle-and-security.md), revised for Cloudflare only, owns project/stage/state identity, remote-operation approval, secrets, ingress, migrations and recovery policy. The deployment/operations guides apply it rather than defining a second policy.
- [0002: Alchemy deployment targets](adr/0002-alchemy-deployment-targets.md), [0003: Alchemy Better Auth](adr/0003-alchemy-better-auth.md) and [0005: Node SQLite and Coolify](adr/0005-node-sqlite-coolify.md) preserve historical decisions, not alternative supported targets. ADR 0006 reaffirms the Alchemy auth direction for Cloudflare only. The [auth guide](stack/auth-guide.md) retains the session lifecycle contract.

The [infrastructure README](../infra/README.md) owns exact Cloudflare configuration and operational commands. Documentation records the approved stack, not proof that migration adoption, deployment or recovery has passed. Every cloud operation, including plan/state bootstrap, requires separate operator approval. SQLite→D1 is an explicit reviewed migration, not an automatic adapter switch.

## Installed generic harness

`docs/engineering/`, `docs/adr/0000-template.md`, and `.agents/` are full local copies of the generic TStack V1 harness. They include 13 skills, their supporting issue template, the prompts placeholder, and the engineering doctrine. The source revision is `0dc16d70a6ecf1a0ddc9617c9c021ed7717a5270`; these copies retain its original contents and formatting. There are no symlinks or runtime dependencies on the TStack parent repository.

The source package in TStack can evolve independently; this installed V1 snapshot remains unchanged. Copies do not synchronize automatically. Review future harness updates explicitly; preserve project-owned context, coding standards, stack guides and ADRs when updating generic assets. Template prompts are empty; no extra agent provider or installer is required. An agent discovers these skills when using this standalone project root; installing them here does not install skills globally or into TStack's root `.agents` directory.

The generic skills describe workflows such as creating GitHub issues or posting reviews. Their presence does not configure GitHub credentials, grant approval for remote writes, or run those workflows automatically.
