---
title: MyApp Context
---

# MyApp Context

## Purpose

This file captures durable product and domain context for MyApp.

Agents should read it before changing application behavior, naming product concepts, adding integrations, or making assumptions about how this product should work.

## Template State

MyApp starts as a generic TStack Next.js SaaS application. Sections containing placeholder or starter content are non-authoritative until the project owner replaces them with real product context.

Before relying on placeholder terms, rules, providers, or decisions as product context, ask the maintainer to confirm or update them.

## Product Summary

MyApp is a standalone Next.js SaaS application scaffolded with TStack. It includes authentication, payments, email, content, file upload, analytics, web3 wallet sign-in, and agent-facing engineering conventions that are ready to customize for the product domain.

## Domain Language

Record the shared vocabulary of this product.

| Term | Meaning | Notes |
|---|---|---|
| Builder | A developer or team customizing this starter application. | Replace or refine when the product has its own user roles. |
| End User | A user of the product built from this application. | Replace with real audience terms when known. |
| Feature | A self-contained module under `src/features/{feature}`. | Expose stable imports through `index.ts` or a narrow server API. |
| MyApp / myapp | Placeholder display name and slug. | Replace during app customization. |

## Important Distinctions

- **Starter behavior vs product behavior**: keep default behavior generic until this project defines its own requirements.
- **Generic doctrine vs stack rules**: generic TDD, testing, review, debugging, and refactoring doctrine lives in `docs/engineering/`; Next.js, Better Auth, Polar, Prisma, email, file-upload, and feature rules live in this docs directory.
- **Project-owned guidance**: `AGENTS.md`, `docs/context.md`, `docs/coding-standards.md`, and `docs/adr/**` should evolve with this application.

## Business Rules

- Keep starter behavior generic until this project defines real product-specific rules.
- Do not add product-specific business logic unless a task explicitly defines it.
- Ask before adding, removing, or replacing major providers such as auth, payments, database, email, analytics, storage, or web3 integrations.
- Treat auth/session, billing/customer state, file downloads, and account deletion as security-sensitive flows.

## External Systems

| System | Role | Boundary Notes |
|---|---|---|
| Next.js App Router | Web application framework. | Respect server/client import boundaries and route groups. |
| Better Auth | Authentication layer. | Treat auth/session behavior as security-sensitive. |
| Polar | Payments, subscriptions, benefits, and credit metering. | Keep provider-specific logic behind Better Auth plugin and billing boundaries. |
| Prisma / PostgreSQL | Data access and persistence. | Schema changes require migration awareness and ADRs for destructive changes. |
| Resend / React Email | Transactional email. | Keep email templates and sending concerns separated. |
| DigitalOcean Spaces / Database upload storage | File upload persistence. | `uploadImage` chooses the storage provider from environment config. |
| PostHog / Umami | Analytics/product telemetry. | Use `captureEvent`; avoid collecting sensitive data by default. |
| Wagmi / RainbowKit / SIWE / viem | Web3 wallet sign-in support. | Treat signatures, nonces, chain IDs, and wallet identity as auth-sensitive. |

## Docs Map

- `docs/coding-standards.md` — application-specific rules layered on top of the shared engineering doctrine.
- `docs/feature-architecture.md` — feature/module structure, route groups, components, locales, and metadata.
- `docs/server-patterns.md` — server queries, server actions, route handlers, errors, email, and file upload patterns.
- `docs/quick-reference.md` — import table and common config/database/handler references.
- `docs/stack/auth-guide.md` — Better Auth, OAuth, Email OTP, SIWE, rate limits, and account lifecycle.
- `docs/stack/payments-polar.md` — Polar checkout, subscriptions, credits, benefits, webhooks, and customer lifecycle.
- `docs/stack/route-guard.md` — protected pages, queries, actions, API routes, middleware, and access gating.
- `docs/stack/feature-scaffold.md` — step-by-step guide for adding feature modules.
- `docs/adr/` — durable architecture and process decisions.

## Decisions and References

- ADR 0001: Prisma is the ORM.
- ADR 0002: Better Auth is the auth provider.
- ADR 0003: Polar is the billing provider.
- Shared engineering rules: `docs/engineering/`.

## Maintenance Rules

- Update this file when durable product terminology, providers, or boundaries change.
- Keep temporary plans in GitHub Issues, not here.
- Keep generic engineering doctrine in `docs/engineering/`, not in this file.
- Add or update ADRs when provider, persistence, release, or security decisions change.
