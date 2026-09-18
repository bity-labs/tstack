# TStack Monorepo Context

## Purpose

TStack is a pnpm/Turborepo monorepo for building and maintaining the TStack product surface. The repository currently contains the generic engineering harness package, the buyer-facing documentation app, the Agent-Ready Boilerplate app, and the customer-facing CLI package.

## Current Scope

- `packages/harness` stores reusable harness templates for agentic software delivery.
- `apps/documentation` is the Fumadocs documentation app for TStack users.
- `apps/boilerplate` is the concrete Next.js SaaS starter app with authentication, billing, email, content, file upload, analytics, web3 wallet sign-in, and agent-facing docs.
- `packages/cli` is the customer-facing CLI (`@tstack/cli`) providing `init`, `ready`, and `products` commands for TStack projects.
- Root repository work should focus on monorepo maintenance, workspace orchestration, product packaging boundaries, and durable engineering guidance.

## V2 Direction

TStack v2 is composable: builders can adopt its components independently, rather than installing one mandatory integrated environment.

The planned components are:

- **Brain** — second-brain/vault folder setup and skills.
- **Harness** — the existing engineering harness.
- **Assistant** — Hermes-based coordination setup.
- **OS** — server setup.
- **Boilerplate** — a product starter generated as one pnpm/Turborepo repository containing separate commercial website, application, and product documentation apps. Each app can be deployed independently; shared packages live within the generated workspace.

The existing Fumadocs application remains the TStack documentation site, distinct from the boilerplate's product documentation. Preserve the current Next.js boilerplate on a `v1` branch created from the current `main`, rather than retaining a `v1-app` in the v2 workspace. Remove the old boilerplate and its stack-specific documentation overlay, `packages/harness/templates/tstack-next`, from the v2 workspace during the build. Both remain preserved on `v1`. Keep `packages/harness/templates/default` as the generic, platform-independent harness; no replacement stack-specific overlay is defined yet.

TStack contains reusable setup assets only. Personal vault contents, live assistant configuration/state, and server secrets belong outside this repository. Brain, assistant, and OS components supply reusable templates, skills, configuration examples, and setup tooling rather than a personal installation.

V2 maintains one pnpm/Turborepo source workspace, not a nested boilerplate workspace. The agreed app layout is `apps/documentation` for TStack documentation and `apps/boilerplate-website`, `apps/boilerplate-application`, and `apps/boilerplate-docs` for the new starter. The CLI will export the three new starter apps and their required shared packages into a standalone product workspace. The empty source shell is now in place. The old boilerplate and `tstack-next` overlay have been removed; `tstack init` reports that v2 scaffolding is not implemented yet. New component directories contain only short `README.md` placeholders describing their purpose and unimplemented status, with no package manifests or runtime behavior.

Reusable components live under `packages/brain`, `packages/harness`, `packages/assistant`, and `packages/os`. Each owns its templates, skills, setup assets, and component documentation; these may be asset packages rather than JavaScript libraries. `packages/cli` provides the shared setup entry point.

Develop v2 on the `v2` branch, then merge it into `main` when implemented. After integration, retire the temporary `v2` branch; the intended version branches are `v1` for the preserved baseline and `main` for v2 onward. This does not imply deleting unrelated existing branches.

Installation targets and integration contracts are not yet decided. Only the empty shell restructuring is implemented. Broader cleanup of legacy context, ADRs, and public documentation is the next separate pass; component implementation remains deferred.

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
