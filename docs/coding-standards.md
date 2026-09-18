# TStack Coding Standards

## Workflow

1. Read `AGENTS.md` before changing the repository.
2. Read `docs/context.md` for durable monorepo context.
3. Use `docs/engineering/` for shared engineering doctrine when a task touches design, testing, refactoring, debugging, or review practices.
4. Make the smallest focused change that satisfies the issue.
5. Validate with the relevant root pnpm script, or explain why validation could not run.

## Monorepo Rules

- Use pnpm workspaces and Turbo for root orchestration.
- Keep workspace boundaries clear: applications live in `apps/*`; packages live in `packages/*`.
- Do not implement CLI, installer, scaffold, release, payment, deployment, or repository automation behavior without a dedicated issue.
- Do not add large boilerplate features, providers, or product-specific behavior without a dedicated issue.
- Preserve `.gitkeep` files only for directories that must remain tracked while empty.
- Keep root documentation about maintaining this repository. Public TStack documentation belongs in `apps/documentation`; `apps/boilerplate-docs` is the future product documentation template.
- README-only component directories are intentional placeholders, not runnable workspace packages. Do not add manifests, dependencies, or speculative implementation just to populate them.

## Harness Dogfooding

- Root `.agents` is a symlink to `packages/harness/templates/default/.agents`.
- Editing files under root `.agents/skills` changes the harness template source of truth.
- Root `docs/engineering` is a symlink to `packages/harness/templates/default/docs/engineering` so shared engineering doctrine is not duplicated.
- Root `AGENTS.md`, `docs/context.md`, `docs/coding-standards.md`, and `docs/adr/**` are real monorepo-specific working documents, not symlinks to the harness template.
- Any standalone install or boilerplate scaffold must copy every harness file as a real file so the target project works in isolation.

## Validation Commands

Run commands from the repository root:

```sh
pnpm build
pnpm lint
pnpm test
pnpm typecheck
```

These commands route through Turbo for packages with manifests and matching scripts. README-only placeholders are not included. The CLI has tests and TypeScript checks; the documentation app has real typecheck/build commands but placeholder test/lint scripts. Do not describe those placeholders as test or lint coverage.
