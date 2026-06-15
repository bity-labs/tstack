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
- Do not implement CLI, boilerplate app, documentation app, installer, scaffold, release, payment, deployment, or repository automation behavior without a dedicated issue.
- Preserve `.gitkeep` files only for directories that must remain tracked while empty.
- Keep root documentation about maintaining this repository. Buyer-facing documentation belongs to the future documentation app when that app has a dedicated issue.

## Harness Dogfooding

- Root `.agents` is a symlink to `packages/harness/templates/default/.agents`.
- Editing files under root `.agents/skills` changes the harness template source of truth.
- Root `docs/engineering` is a symlink to `packages/harness/templates/default/docs/engineering` so shared engineering doctrine is not duplicated.

## Validation Commands

Run commands from the repository root:

```sh
pnpm build
pnpm lint
pnpm test
pnpm typecheck
```

These commands currently route through Turbo and should pass or no-op cleanly for workspaces without matching scripts.
