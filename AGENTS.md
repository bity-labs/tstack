# Agent Guidance

- Write code, comments, documentation, and README files in English.
- Root `apps/website` and `apps/docs` belong to TStack, not to generated SaaS projects.
- Root `.agents/skills` exposes the harness source through a symlink. Resolve skill-local references from the file's real path. For project context, use this file and the root README for TStack, or the boilerplate's own guidance for SaaS work; harness template documents are not facts about this repository.
- `packages/boilerplate` is an independent pnpm/Turbo workspace and the runnable source distributed to users. Edit it directly; keep its dependencies, configuration, and tooling self-contained. Its `AGENTS.md` applies inside that workspace.
- Install both workspaces separately. Use root `dev` for the TStack sites, `dev:boilerplate` for the SaaS stack, and `check:boilerplate` for its checks. Run filtered boilerplate commands with `pnpm --dir packages/boilerplate --filter <package> <script>`.
- Keep root shared configurations for the TStack sites separate from the boilerplate's own configurations. Do not add cross-workspace imports or links.
- The SaaS deployment strategy is Cloudflare-only through Alchemy `2.0.0-beta.87`: API/web Workers, D1 and static website/docs. Bun `1.4.4` is local development/tooling, not the deployed Worker runtime. Follow the boilerplate's current ADRs; do not restore historical multi-provider or self-hosting instructions.
- Add or update each workspace's README when its commands or configuration change.
