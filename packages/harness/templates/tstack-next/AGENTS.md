# Agent Guidance - MyApp

This is a standalone Next.js application scaffolded with TStack. Treat this repository and its local `docs/` files as the source of truth for project-specific product behavior and engineering guidance.

## Navigation Protocol

1. Read this file first.
2. Read `docs/coding-standards.md` before changing code.
3. Read `docs/context.md` when the task touches product behavior, domain language, providers, or business rules.
4. Read the relevant stack doc under `docs/stack/` before changing auth, billing, route protection, or feature scaffolding.
5. Read `docs/engineering/index.md` and load only the shared engineering rule files relevant to the task.
6. Check `docs/adr/` before changing architecture, provider choices, data ownership, security-sensitive flows, or long-term process constraints.

## Source of Truth

- GitHub Issues hold specs, tasks, and acceptance criteria.
- `docs/context.md` holds durable product and domain language.
- `docs/coding-standards.md` holds project-specific implementation expectations.
- `docs/feature-architecture.md`, `docs/server-patterns.md`, `docs/quick-reference.md`, and `docs/stack/` hold stack-specific guidance.
- `docs/engineering/` holds reusable engineering doctrine.
- `docs/adr/` holds durable decisions and rationale.
- `.agents/skills/` holds reusable TStack workflows.

## Working Rules

- Understand the requested outcome before editing.
- Keep the starter generic until this project defines its own domain behavior.
- Do not add dependencies, providers, services, or large abstractions without asking.
- Treat auth/session, billing/customer state, file downloads, account deletion, email, telemetry, and wallet sign-in as sensitive flows.
- Prefer behavior verified through public interfaces.
- Validate before finishing, or explain why validation could not be run.
- Report what changed, what was validated, and what risk remains.
