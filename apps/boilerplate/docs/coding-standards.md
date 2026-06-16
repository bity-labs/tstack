---
title: TStack Agent-Ready Boilerplate Coding Standards
---

## Principle

Keep the boilerplate production-ready, easy to customize, and aligned with the shared TStack Engineering Harness.

This file adds boilerplate-specific rules on top of the generic harness doctrine in `docs/engineering/`. Do not copy generic TDD, testing, mocking, refactoring, or code-review doctrine here; load those shared rule files when the task requires them.

## Default Workflow

1. Read `AGENTS.md` from the boilerplate root.
2. Read `docs/context.md` before changing application behavior, naming, providers, or domain language.
3. Read the relevant stack reference before touching auth, billing, route protection, feature structure, or server handlers.
4. Read `docs/engineering/index.md` and load only the generic engineering rules relevant to the task.
5. Make the smallest focused change that satisfies the issue.
6. Validate with the narrowest relevant boilerplate commands from the repository root.
7. Report what changed, what was validated, and any remaining risk.

## App Boundaries

- `apps/boilerplate` owns the concrete Next.js SaaS starter application.
- `packages/harness/templates/default` owns reusable agent instructions, skills, and generic engineering doctrine.
- `apps/boilerplate/AGENTS.md`, `apps/boilerplate/docs/context.md`, `apps/boilerplate/docs/coding-standards.md`, `apps/boilerplate/docs/adr/`, `apps/boilerplate/docs/feature-architecture.md`, `apps/boilerplate/docs/server-patterns.md`, `apps/boilerplate/docs/quick-reference.md`, and `apps/boilerplate/docs/stack/` are real boilerplate-specific files.
- `apps/boilerplate/.agents` and `apps/boilerplate/docs/engineering` are symlinks to shared harness-owned assets and should not be replaced with duplicate copies while working inside this monorepo.
- A standalone boilerplate export/scaffold must materialize linked harness assets as real files so the generated app works in isolation.

## Hard Rules

- Follow existing Next.js App Router, React, TypeScript, Prisma, Better Auth, Polar, and Vitest patterns.
- Keep generated artifacts, build output, caches, and local environment files out of commits.
- Do not add dependencies, providers, services, or large abstractions without asking first.
- Treat authentication, payments, database access, email, analytics, file upload, and wallet sign-in as sensitive boundaries.
- Keep source-project or legacy branding out of the boilerplate.
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
- Use `pnpm --filter @tstack/boilerplate db:push` only for local iteration.
- Changes intended for the integration branch must include real migrations generated with the Prisma workflow.
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

Use the shared `docs/engineering/code-review.md` review process first, then add these boilerplate checks when relevant:

- Prisma schema changes include matching migrations and no hand-edited historical migrations.
- Auth changes preserve Better Auth session flow, rate limits, email callbacks, and SIWE verification invariants.
- Polar changes are replay-safe, use stable provider IDs, and do not bypass the `PolarGateway` / Better Auth plugin boundaries.
- Server/client imports respect Next.js boundaries and do not leak server-only dependencies into client components.
- New routes, queries, and actions use `authed` / `publicly` wrappers and typed error/result handling.
- Feature imports go through public APIs or an explicit server-only API surface.
- User-facing messages, metadata, and validation copy come from `locales`.

## Validation

Run commands from the repository root.

```bash
pnpm --filter @tstack/boilerplate lint
pnpm --filter @tstack/boilerplate typecheck
pnpm --filter @tstack/boilerplate test
pnpm --filter @tstack/boilerplate build
```

For workspace-level changes, also consider:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

If a command cannot be run, explain why and state the manual checks performed.
