# TStack Monorepo Context

## Purpose

TStack is a pnpm/Turborepo monorepo for building and maintaining the TStack product surface. The repository currently contains the generic engineering harness package, the buyer-facing documentation app, and the Agent-Ready Boilerplate app. The CLI package is still a placeholder for future installer/scaffold work.

## Current Scope

- `packages/harness` stores reusable harness templates for agentic software delivery.
- `apps/documentation` is the Fumadocs documentation app for TStack users.
- `apps/boilerplate` is the concrete Next.js SaaS starter app with authentication, billing, email, content, file upload, analytics, web3 wallet sign-in, and agent-facing docs.
- `packages/cli` is a tracked placeholder until a dedicated installer/scaffold issue exists.
- Root repository work should focus on monorepo maintenance, workspace orchestration, product packaging boundaries, and durable engineering guidance.

## Repository Boundaries

- Use pnpm workspaces and Turbo from the repository root.
- Keep applications under `apps/*` and packages under `packages/*`.
- Keep root docs focused on the TStack monorepo itself, not buyer-facing documentation app content.
- Shared harness engineering doctrine is sourced from `packages/harness/templates/default/docs/engineering` and exposed at `docs/engineering`.
- In monorepo dev mode, symlink only harness-owned reusable assets: `.agents` and `docs/engineering`.
- Keep project-owned working documents as real files: `AGENTS.md`, `docs/context.md`, `docs/coding-standards.md`, and `docs/adr/**`.
- Future installer/scaffold output must copy all harness files into generated projects so they work without monorepo symlinks.

## Important Terms

| Term | Meaning |
| --- | --- |
| Agent-Ready Boilerplate | Next.js SaaS starter app under `apps/boilerplate`. |
| Documentation app | Fumadocs app under `apps/documentation` that publishes buyer-facing TStack docs. |
| Harness | Reusable agent-facing template assets stored in `packages/harness/templates/default`. |
| Harness-owned asset | Reusable content that should stay linked to the harness source of truth while dogfooding, such as `.agents` and `docs/engineering`. |
| Monorepo root | The orchestration layer for workspace configuration, root docs, and repository maintenance. |
| Project-owned working document | Context, standards, ADRs, or agent entrypoints that belong to a concrete project and should be copied/customized instead of symlinked. |
| Template assets | Files intended to be reused by projects that install or dogfood the harness. |

## References

- Root agent guidance: `AGENTS.md`
- Repo-level standards: `docs/coding-standards.md`
- Architecture decisions: `docs/adr/`
