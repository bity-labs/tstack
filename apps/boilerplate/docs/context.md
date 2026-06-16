---
title: TStack Agent-Ready Boilerplate Context
---

## Purpose

This file captures durable product and domain context for `apps/boilerplate`.

Agents should read it before changing boilerplate behavior, naming product concepts, adding integrations, or making assumptions about how the starter app should be used.

## Product Summary

The TStack Agent-Ready Boilerplate is the application layer of TStack: a production-ready Next.js starter for SaaS products that includes authentication, payments, email, content, and agent-facing engineering conventions.

Inside this monorepo, the boilerplate consumes the shared TStack Engineering Harness from `packages/harness/templates/default` through symlinks. Boilerplate-specific context stays in this directory; generic engineering doctrine stays in the harness.

## Domain Language

| Term | Meaning | Notes |
|---|---|---|
| TStack | The broader product for agent-ready software delivery. | The monorepo includes the harness, docs app, and boilerplate. |
| Engineering Harness | Shared agent instructions, skills, and engineering doctrine. | Source of truth: `packages/harness/templates/default`. |
| Agent-Ready Boilerplate | The Next.js starter application in `apps/boilerplate`. | Uses the shared harness instead of duplicating it. |
| Builder | A developer or team starting a product from the boilerplate. | Buyer/user of the starter, not necessarily an end user of their app. |
| End User | A user of the product built from the boilerplate. | Domain behavior should remain generic until a builder customizes it. |
| MyApp / myapp | Placeholder display name and slug. | Replace during app customization. |

## Important Distinctions

- **Harness vs boilerplate**: harness files define reusable agent workflow and engineering standards; boilerplate files define the concrete SaaS starter app.
- **Monorepo source vs standalone app**: symlinks are valid in this monorepo. A future scaffold/export flow should materialize harness files as real files for standalone projects.
- **Generic starter behavior vs buyer domain behavior**: do not add product-specific business rules unless a task explicitly defines them.

## Business Rules

- Keep the boilerplate generic and reusable until a buyer customizes it.
- Do not reintroduce source-project branding or legacy import names.
- Do not duplicate `.agents`, `AGENTS.md`, or generic `docs/engineering` content under the boilerplate app.
- Preserve boilerplate-specific docs as real files: `docs/context.md`, `docs/coding-standards.md`, and `docs/adr/`.
- Ask before adding, removing, or replacing major providers such as auth, payments, database, email, analytics, or web3 integrations.

## External Systems

| System | Role | Boundary Notes |
|---|---|---|
| Next.js | Web application framework. | App Router conventions apply. |
| Better Auth | Authentication layer. | Treat auth/session behavior as security-sensitive. |
| Polar | Payments and billing integration. | Keep provider-specific logic isolated. |
| Prisma / PostgreSQL | Data access and persistence. | Schema changes require migration awareness. |
| Resend / React Email | Transactional email. | Keep email templates and sending concerns separated. |
| PostHog | Analytics/product telemetry. | Avoid collecting sensitive data by default. |
| Wagmi / SIWE / viem | Web3 wallet sign-in support. | Treat signatures and wallet identity as auth-sensitive. |

## Decisions and References

- GitHub issue #9 imported the boilerplate application into `apps/boilerplate`.
- GitHub issue #10 rebranded the imported app for TStack.
- GitHub issue #11 wires the boilerplate to the shared harness via symlinks.
- Shared engineering rules: `docs/engineering/`.
- Boilerplate ADRs: `docs/adr/`.

## Maintenance Rules

- Update this file when durable boilerplate terminology, providers, or boundaries change.
- Keep temporary plans in GitHub Issues, not here.
- Keep generic engineering doctrine in the shared harness, not in this file.
