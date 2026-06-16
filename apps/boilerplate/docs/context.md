---
title: TStack Agent-Ready Boilerplate Context
---

## Purpose

This file captures durable product and domain context for `apps/boilerplate`.

Agents should read it before changing boilerplate behavior, naming product concepts, adding integrations, or making assumptions about how the starter app should be used.

## Product Summary

The TStack Agent-Ready Boilerplate is the application layer of TStack: a production-ready Next.js starter for SaaS products that includes authentication, payments, email, content, file upload, analytics, web3 wallet sign-in, and agent-facing engineering conventions.

Inside this monorepo, the boilerplate consumes the shared TStack Engineering Harness from `packages/harness/templates/default` through symlinks. Boilerplate-specific context stays in this directory; generic engineering doctrine stays in the harness.

## Domain Language

| Term | Meaning | Notes |
|---|---|---|
| TStack | The broader product for agent-ready software delivery. | The monorepo includes the harness, docs app, and boilerplate. |
| Engineering Harness | Shared agent instructions, skills, and engineering doctrine. | Source of truth: `packages/harness/templates/default`. |
| Agent-Ready Boilerplate | The Next.js starter application in `apps/boilerplate`. | Uses the shared harness instead of duplicating it. |
| Builder | A developer or team starting a product from the boilerplate. | Buyer/user of the starter, not necessarily an end user of their app. |
| End User | A user of the product built from the boilerplate. | Domain behavior should remain generic until a builder customizes it. |
| Feature | A self-contained module under `src/features/{feature}`. | Expose stable imports through `index.ts` or a narrow server API. |
| Integration Branch | The long-lived `quality` branch used before release to `main`. | See ADR 0004. |
| MyApp / myapp | Placeholder display name and slug. | Replace during app customization. |

## Important Distinctions

- **Harness vs boilerplate**: harness files define reusable agent workflow and engineering standards; boilerplate files define the concrete SaaS starter app.
- **Generic doctrine vs stack rules**: generic TDD/testing/review doctrine lives in `docs/engineering/`; stack-specific Next.js, Better Auth, Polar, Prisma, email, file-upload, and feature rules live in this docs directory.
- **Monorepo source vs standalone app**: symlinks are valid in this monorepo. A future scaffold/export flow should materialize harness files as real files for standalone projects.
- **Generic starter behavior vs buyer domain behavior**: do not add product-specific business rules unless a task explicitly defines them.

## Business Rules

- Keep the boilerplate generic and reusable until a builder customizes it.
- Do not reintroduce source-project branding or legacy import names.
- Do not duplicate `.agents`, `AGENTS.md`, or generic `docs/engineering` content under the boilerplate app.
- Preserve boilerplate-specific docs as real files under `apps/boilerplate/docs/`.
- Ask before adding, removing, or replacing major providers such as auth, payments, database, email, analytics, storage, or web3 integrations.
- Treat auth/session, billing/customer state, file downloads, and account deletion as security-sensitive flows.

## External Systems

| System | Role | Boundary Notes |
|---|---|---|
| Next.js App Router | Web application framework. | Respect server/client import boundaries and route groups. |
| Better Auth | Authentication layer. | Treat auth/session behavior as security-sensitive. |
| Polar | Payments, subscriptions, benefits, and credit metering. | Keep provider-specific logic behind Better Auth plugin and `PolarGateway` boundaries. |
| Prisma / PostgreSQL | Data access and persistence. | Schema changes require migration awareness and ADRs for destructive changes. |
| Resend / React Email | Transactional email. | Keep email templates and sending concerns separated. |
| DigitalOcean Spaces / Database upload storage | File upload persistence. | `uploadImage` chooses the storage provider from environment config. |
| PostHog / Umami | Analytics/product telemetry. | Use `captureEvent`; avoid collecting sensitive data by default. |
| Wagmi / RainbowKit / SIWE / viem | Web3 wallet sign-in support. | Treat signatures, nonces, chain IDs, and wallet identity as auth-sensitive. |

## Boilerplate Docs Map

- `docs/coding-standards.md` — boilerplate-specific rules layered on top of the shared harness.
- `docs/feature-architecture.md` — feature/module structure, route groups, components, locales, and metadata.
- `docs/server-patterns.md` — server queries, server actions, route handlers, errors, email, and file upload patterns.
- `docs/quick-reference.md` — import table and common config/database/handler references.
- `docs/stack/auth-guide.md` — Better Auth, OAuth, Email OTP, SIWE, rate limits, and account lifecycle.
- `docs/stack/payments-polar.md` — Polar checkout, subscriptions, credits, benefits, webhooks, and customer lifecycle.
- `docs/stack/route-guard.md` — protected pages, `authed.query`, `authed.route`, middleware, and access gating.
- `docs/stack/feature-scaffold.md` — step-by-step guide for adding feature modules.
- `docs/adr/` — durable boilerplate architecture and process decisions.

## Decisions and References

- GitHub issue #9 imported the boilerplate application into `apps/boilerplate`.
- GitHub issue #10 rebranded the imported app for TStack.
- GitHub issue #11 wires the boilerplate to the shared harness via symlinks.
- GitHub issue #12 reconciles boilerplate-specific docs with the shared TStack harness.
- ADR 0001: Prisma is the ORM.
- ADR 0002: Better Auth is the auth provider.
- ADR 0003: Polar is the billing provider.
- ADR 0004: the `quality` branch is the boilerplate integration gate before `main`.
- Shared engineering rules: `docs/engineering/`.

## Maintenance Rules

- Update this file when durable boilerplate terminology, providers, or boundaries change.
- Keep temporary plans in GitHub Issues, not here.
- Keep generic engineering doctrine in the shared harness, not in this file.
- Add or update ADRs when provider, persistence, release, or security decisions change.
