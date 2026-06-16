---
title: TStack Agent-Ready Boilerplate Coding Standards
---

## Principle

Keep the boilerplate production-ready, easy to customize, and aligned with the shared TStack Engineering Harness.

## Default Workflow

1. Read `AGENTS.md` from the boilerplate root.
2. Read `docs/context.md` before changing application behavior, naming, providers, or domain language.
3. Read `docs/engineering/index.md` and load only the generic engineering rules relevant to the task.
4. Make the smallest focused change that satisfies the issue.
5. Validate with the narrowest relevant boilerplate commands from the repository root.
6. Report what changed, what was validated, and any remaining risk.

## App Boundaries

- `apps/boilerplate` owns the concrete Next.js SaaS starter application.
- `packages/harness/templates/default` owns reusable agent instructions, skills, and generic engineering doctrine.
- `apps/boilerplate/docs/context.md`, `apps/boilerplate/docs/coding-standards.md`, and `apps/boilerplate/docs/adr/` are real boilerplate-specific files.
- `apps/boilerplate/AGENTS.md`, `apps/boilerplate/.agents`, and `apps/boilerplate/docs/engineering` are symlinks to the shared harness and should not be replaced with duplicate copies.

## Rules

- Follow existing Next.js App Router, React, TypeScript, Prisma, and testing patterns.
- Keep generated artifacts, build output, caches, and local environment files out of commits.
- Do not add dependencies, providers, services, or large abstractions without asking first.
- Treat authentication, payments, database access, email, analytics, and wallet sign-in as sensitive boundaries.
- Keep source-project or legacy branding out of the boilerplate.
- Prefer behavior tests through public interfaces over implementation-detail tests.
- Add ADRs when a change creates or revises durable architecture, provider, data ownership, or security decisions.

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
