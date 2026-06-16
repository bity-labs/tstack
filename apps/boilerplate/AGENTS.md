# Agent Guidance - TStack Agent-Ready Boilerplate

This app dogfoods the TStack Engineering Harness, but it is also its own project surface. Treat this file and the local `docs/` files as boilerplate-specific working documents.

## Navigation Protocol

1. Read this file first.
2. Read `docs/coding-standards.md` before changing code.
3. Read `docs/context.md` when the task touches product behavior, domain language, providers, or business rules.
4. Read the relevant stack doc under `docs/stack/` before changing auth, billing, route protection, or feature scaffolding.
5. Read `docs/engineering/index.md` and load only the shared engineering rule files relevant to the task.
6. Check `docs/adr/` before changing architecture, provider choices, data ownership, security-sensitive flows, or long-term process constraints.

## Source of Truth

- GitHub Issues hold specs, tasks, and acceptance criteria.
- `docs/context.md` holds durable boilerplate product and domain language.
- `docs/coding-standards.md` holds boilerplate-specific implementation expectations.
- `docs/feature-architecture.md`, `docs/server-patterns.md`, `docs/quick-reference.md`, and `docs/stack/` hold stack-specific guidance.
- `docs/engineering/` holds reusable TStack engineering doctrine.
- `docs/adr/` holds durable boilerplate decisions and rationale.
- `.agents/skills/` holds reusable TStack workflows.

## Harness Dogfooding Policy

Inside this monorepo, only harness-owned assets are symlinked back to the shared harness template:

- `.agents` -> `../../packages/harness/templates/default/.agents`
- `docs/engineering` -> `../../../packages/harness/templates/default/docs/engineering`

Project-owned working documents are real files and may diverge from the generic harness template:

- `AGENTS.md`
- `docs/context.md`
- `docs/coding-standards.md`
- `docs/adr/**`
- stack-specific boilerplate docs under `docs/`

A standalone app created from the boilerplate must materialize every harness file as a real copy so it works in isolation without this monorepo.

## Working Rules

- Understand the requested outcome before editing.
- Keep the starter generic unless an issue explicitly defines product-specific behavior.
- Do not reintroduce source-project or legacy branding.
- Do not add dependencies, providers, services, or large abstractions without asking.
- Treat auth/session, billing/customer state, file downloads, account deletion, email, telemetry, and wallet sign-in as sensitive flows.
- Prefer behavior verified through public interfaces.
- Validate before finishing, or explain why validation could not be run.
- Report what changed, what was validated, and what risk remains.
