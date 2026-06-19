---
title: MyApp Coding Standards
---

# MyApp Coding Standards

## Principle

Keep this application production-ready, easy to customize, and aligned with the shared engineering doctrine in `docs/engineering/`.

This file adds application-specific rules on top of the generic doctrine in `docs/engineering/`. Do not copy generic TDD, testing, mocking, refactoring, or code-review doctrine here; load those shared rule files when the task requires them.

## Default Workflow

1. Read `AGENTS.md` from the project root.
2. Read `docs/context.md` before changing application behavior, naming, providers, or domain language.
3. Read the relevant stack reference before touching auth, billing, route protection, feature structure, or server handlers.
4. Read `docs/engineering/index.md` and load only the generic engineering rules relevant to the task.
5. Make the smallest focused change that satisfies the issue.
6. Validate with the narrowest relevant project commands.
7. Report what changed, what was validated, and any remaining risk.

## App Boundaries

- This repository owns the concrete Next.js SaaS application.
- `AGENTS.md`, `docs/context.md`, `docs/coding-standards.md`, `docs/adr/`, `docs/feature-architecture.md`, `docs/server-patterns.md`, `docs/quick-reference.md`, and `docs/stack/` are project-owned files and may evolve as this product develops.
- `docs/engineering/` and `.agents/skills/` provide reusable agentic engineering workflows and doctrine.

## Hard Rules

- Follow existing Next.js App Router, React, TypeScript, Prisma, Better Auth, Polar, and Vitest patterns.
- Keep generated artifacts, build output, caches, and local environment files out of commits.
- Do not add dependencies, providers, services, or large abstractions without asking first.
- Treat authentication, payments, database access, email, analytics, file upload, and wallet sign-in as sensitive boundaries.
- Keep source-project or placeholder branding out of customized product code.
- Use `logger` from `@/lib/logger` for application logging; do not add new `console.*` calls.
- Use `captureEvent` from `@/lib/tracking`; do not call analytics providers directly from feature code.
- Use typed errors from `@/lib/errors` or explicit result unions for expected failures. Do not introduce new `throw new Error(string)` paths in handlers, actions, or services.
- No new `any` or broad `as Type` assertions. Prefer type guards, schema parsing, discriminated unions, and inferred types.
- Prefer behavior tests through public interfaces over implementation-detail tests.
- Add ADRs when a change creates or revises durable architecture, provider, data ownership, security, or process decisions.

## Feature and Import Rules

- Feature code lives under `src/features/{feature-name}/` and should expose its stable surface through `index.ts`.
- Imports from outside a feature should use that feature's public API. If a bootstrap or auth path needs a narrower server-only surface, add a dedicated `server-api.ts` like `src/features/billing/server-api.ts`.
- Avoid deep cross-feature imports. If a use case needs data or UI from multiple features, prefer a small orchestrator surface instead of coupling feature internals together.
- Keep database access in services or infrastructure modules. Queries, actions, and routes should call service functions instead of reaching into Prisma directly.
- Put user-facing copy, validation messages, and metadata in `src/locales/index.ts` unless an issue explicitly asks for inline copy.
- Use `src/config/routes.ts` for route constants and `src/config/env.ts` for environment reads.

## Stack-Specific Rules

### Prisma migrations

- Migrations are forward-only. Never edit a committed migration; create a new one.
- Use `pnpm db:push` only for local iteration.
- Changes intended for shared branches must include real migrations generated with the Prisma workflow.
- Dropping or renaming columns requires an ADR because the data-loss risk is not reversible.
- Import the Prisma client from `@/lib/db`; do not instantiate a second client.

### Better Auth flows

- Do not reconstruct sessions from cookies or headers manually.
- Use `auth.api.getSession` for inline page guards and the `authed` / `publicly` helpers from `@/lib/handler` for queries, actions, and API routes.
- New providers, rate-limit rules, email callbacks, user lifecycle hooks, or plugins belong under `src/lib/auth/*`.
- Read `docs/stack/auth-guide.md` before touching auth or SIWE behavior.

### Polar billing

- Webhook side effects must be idempotent under replay.
- Persist and reconcile using stable Polar IDs (`customer`, `subscription`, `order`, `product`, `meter`), never webhook arrival order.
- Webhooks are handled through the Better Auth Polar plugin in `src/lib/auth/plugins/polar.ts`; do not add a parallel webhook route without an ADR.
- Auth lifecycle and webhook bridges go through `src/lib/auth/side-effects.ts` and narrow feature server APIs.
- Read `docs/stack/payments-polar.md` before touching billing, credits, products, meters, benefits, or customer cleanup.

### Next.js server/client boundaries

- Files using server actions start with `"use server"`.
- Server-only modules (`*.service.ts`, `*.query.ts`, route handlers, Prisma, Better Auth, Polar SDK, email sending, file upload storage) must not be imported by `"use client"` components.
- Client components may call server actions, hooks, or public API routes; they should not import server services directly.
- Route protection patterns live in `docs/stack/route-guard.md`.

### Email, files, and telemetry

- Transactional email goes through `sendEmail` from `@/lib/email/send-email` and the discriminated `EmailMessage` union in `@/lib/email/types`.
- Auth email callbacks are adapted in `src/lib/auth/email-hooks.ts`; do not duplicate provider-specific email sending in routes.
- File uploads go through `uploadImage` from `@/lib/file-upload`, which chooses database or DigitalOcean Spaces based on `env.upload.provider`.
- File download routes must validate ownership or access before exposing stored files.
- Keep telemetry events sparse, named with product behavior, and free of sensitive payloads.

## Stack-Specific Review Checks

Use the shared `docs/engineering/code-review.md` review process first, then add these application checks when relevant:

- Prisma schema changes include matching migrations and no hand-edited historical migrations.
- Auth changes preserve Better Auth session flow, rate limits, email callbacks, and SIWE verification invariants.
- Polar changes are replay-safe, use stable provider IDs, and do not bypass the `PolarGateway` / Better Auth plugin boundaries.
- Server/client imports respect Next.js boundaries and do not leak server-only dependencies into client components.
- New routes, queries, and actions use `authed` / `publicly` wrappers and typed error/result handling.
- Feature imports go through public APIs or an explicit server-only API surface.
- User-facing messages, metadata, and validation copy come from `locales`.

## Validation

Run the narrowest command that covers the change:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

If a command cannot be run, explain why and state the manual checks performed.
