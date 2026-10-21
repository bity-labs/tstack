# Agent Guidance

This repository is a small Turborepo product workspace. Keep changes focused on repository maintenance unless a dedicated issue explicitly asks for product implementation.

- Use pnpm workspaces and Turbo for root orchestration.
- Keep `apps/*` and `packages/*` as workspace boundaries.
- Root `.agents` is symlinked to `packages/harness/templates/default/.agents` so the monorepo dogfoods the harness template. Edits under `.agents/skills` modify the product harness template source of truth.
- Root `.pi/agents` and `.pi/prompts` are symlinked to the matching directories under `packages/harness/templates/default/.pi`. Keep `.pi` itself real so local settings and runtime state stay project-owned; do not put them in the harness template.
- Root `docs/engineering` is symlinked to `packages/harness/templates/default/docs/engineering`; shared engineering doctrine should not be duplicated.
- Keep project-owned working documents as real files, not symlinks: `AGENTS.md`, `docs/context.md`, `docs/coding-standards.md`, and `docs/adr/**`.
- `apps/boilerplate` follows the same policy: `.agents` and `docs/engineering` are linked harness assets; its `AGENTS.md`, context, standards, ADRs, and stack docs are copied/customized app docs.
- Any future installer or boilerplate scaffold must copy all harness files into the target project so it works without monorepo symlinks.
- Do not add CLI, installer/scaffold, release automation, provider integrations, large boilerplate behavior, documentation app features, or template implementation code without a dedicated issue.
- Preserve placeholder `.gitkeep` files only where empty directories must remain tracked.
