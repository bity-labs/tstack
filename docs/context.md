# TStack Monorepo Context

## Purpose

TStack is a pnpm/Turborepo monorepo for building and maintaining the TStack product surface. The repository currently contains an engineering harness package, a buyer-facing documentation app, and placeholders for future CLI and boilerplate app work.

## Current Scope

- `packages/harness` stores reusable harness templates for agentic software delivery.
- `apps/documentation` is the Fumadocs documentation app for TStack users.
- `apps/boilerplate` and `packages/cli` are tracked placeholders until dedicated implementation issues exist.
- Root repository work should focus on monorepo maintenance, workspace orchestration, and durable engineering guidance.

## Repository Boundaries

- Use pnpm workspaces and Turbo from the repository root.
- Keep applications under `apps/*` and packages under `packages/*`.
- Keep root docs focused on the TStack monorepo itself, not buyer-facing documentation app content.
- Shared harness engineering doctrine is sourced from `packages/harness/templates/default/docs/engineering` and exposed at `docs/engineering`.

## Important Terms

| Term | Meaning |
| --- | --- |
| Documentation app | Fumadocs app under `apps/documentation` that publishes buyer-facing TStack docs. |
| Harness | Reusable agent-facing template assets stored in `packages/harness/templates/default`. |
| Monorepo root | The orchestration layer for workspace configuration, root docs, and repository maintenance. |
| Template assets | Files intended to be reused by projects that install or dogfood the harness. |

## References

- Root agent guidance: `AGENTS.md`
- Repo-level standards: `docs/coding-standards.md`
- Architecture decisions: `docs/adr/`
