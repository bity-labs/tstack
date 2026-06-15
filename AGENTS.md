# Agent Guidance

This repository is a small Turborepo product workspace. Keep changes focused on repository maintenance unless a dedicated issue explicitly asks for product implementation.

- Use pnpm workspaces and Turbo for root orchestration.
- Keep `apps/*` and `packages/*` as workspace boundaries.
- Root `.agents` is symlinked to `packages/harness/templates/default/.agents` so the monorepo dogfoods the harness template. Edits under `.agents/skills` modify the product harness template source of truth.
- Root `docs/engineering` is symlinked to `packages/harness/templates/default/docs/engineering`; keep root `docs/context.md`, `docs/coding-standards.md`, and `docs/adr/` focused on this monorepo.
- Do not add CLI, harness, boilerplate, documentation, or template implementation code without a dedicated issue.
- Preserve placeholder `.gitkeep` files only where empty directories must remain tracked.
