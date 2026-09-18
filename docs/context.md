# TStack Context

## Purpose

TStack provides composable, reusable setup components. Builders can adopt them independently rather than installing one mandatory environment. This repository contains source assets and tooling, not personal vault contents, live assistant state, or server secrets.

## Current Workspace

| Path | Responsibility | Status |
| --- | --- | --- |
| `apps/documentation` | TStack's public Fumadocs documentation | Existing app |
| `apps/boilerplate-website` | Product commercial/marketing website | README placeholder |
| `apps/boilerplate-application` | Product application | README placeholder |
| `apps/boilerplate-docs` | Product customer documentation | README placeholder |
| `packages/brain` | Second-brain/vault folder setup and skills | README placeholder |
| `packages/harness` | Generic engineering instructions, skills, and doctrine | Existing template assets |
| `packages/assistant` | Hermes-based coordination setup | README placeholder |
| `packages/os` | Server setup assets | README placeholder |
| `packages/cli` | Shared setup entry point | Retained CLI; v2 scaffolding unavailable |

The CLI's `ready` and `products` commands retain legacy configuration behavior for existing compatible projects. They do not implement the new component setup. `init` reports that v2 scaffolding is not implemented yet.

## Agreed Boundaries

- Maintain one pnpm/Turborepo source workspace, with applications under `apps/*` and reusable components under `packages/*`.
- Keep reusable components independently usable. Integration is optional.
- Develop the three boilerplate apps in this root workspace, not in a nested monorepo.
- The planned boilerplate export is one standalone pnpm/Turborepo project containing a website, application, and product documentation, deployable independently. Exporting required shared packages is future work.
- Asset packages need not be JavaScript libraries. README-only placeholders have no package manifests, scripts, or runtime behavior.
- Keep personal installations, credentials, and runtime data outside TStack.

## Documentation Ownership

- `apps/documentation` documents TStack itself; `apps/boilerplate-docs` is the future documentation app shipped with a builder's product.
- Root `docs/` contains internal project context, standards, and ADRs.
- `packages/harness/templates/default` owns the platform-independent engineering harness.
- Root `.agents` and `docs/engineering` link to that generic template. Editing them changes the shared source of truth.
- `AGENTS.md`, `docs/context.md`, `docs/coding-standards.md`, and `docs/adr/**` are real project-owned files.
- Standalone installs must copy harness files so they work without this checkout.

## Open Decisions

Component internals, installation contracts, provider choices, and replacement stack-specific guidance remain undefined. Decide these incrementally when implementing the relevant component; do not infer them from the previous starter.

## References

- [Agent guidance](../AGENTS.md)
- [Coding standards](coding-standards.md)
- [Workspace architecture](adr/0001-composable-v2-workspace.md)
