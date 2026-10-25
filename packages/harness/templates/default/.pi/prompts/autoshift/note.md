# Autoshift deployment note

This directory configures the Pi deployment that `/autoshift` depends on. It is
documentation, not runtime configuration.

- `settings.example.json` is the role configuration contract: read-only
  `reviewer`/`scout` boundaries and the `worker` writer contract. Merge it into
  the project's real `.pi/settings.json` (never commit live settings here) with
  `.agents/skills/setup-pi-subagents/SKILL.md`.
- Model ids for the implementation tiers are deliberately absent. Select them at
  dispatch (per-launch model override) or in project/user
  `subagents.agentOverrides.worker.model`; see `.pi/agents/README.md`.

Rationale: project agent files shadow bundled pi-subagents builtins wholesale,
so tool, skill, and model boundaries live in settings instead of copied agent
prompts. `/autoshift` preflight requires this configuration; see the tier
policy in `docs/engineering/roles.md`.

**Not a test:** this note and the example file are packaging-time contract
documentation. They prove nothing about model behavior at run time.
