# @tstack/harness

Generic TStack engineering harness package for agentic software delivery.

The harness is independent from any boilerplate application. It is intended to be copied or installed into an existing codebase so agents have consistent project instructions, coding standards, durable context, engineering doctrine, ADR guidance, and reusable skills.

## Template structure

Installable payloads live under `templates/*`:

```txt
templates/
  default/
    AGENTS.md
    docs/
      context.md
      coding-standards.md
      adr/
      engineering/
    .agents/
      skills/
    .pi/
      agents/
      prompts/
  pi-notes/
    .pi/agents/
  pi-research/
    .pi/agents/
```

`templates/default` contains the generic harness payload and is the only
payload installed by default. Future variants can be added as sibling
directories under `templates/` without changing the package boundary.

## Pi assets

Keep Pi-specific agent definitions in `.pi/agents/` and slash-command prompts in `.pi/prompts/`. Shared skills remain in `.agents/skills/`; these are separate discovery locations, not interchangeable directories.

The default template defines one project agent, `planner`, and uses the
[pi-subagents](https://pi.dev/packages/pi-subagents) builtin `scout`, `worker`,
and `reviewer` agents with configured role boundaries. Install pi-subagents
with `pi install npm:pi-subagents` (Pi 1.2.0+), trust the target project, merge
the role contract from
`templates/default/.pi/prompts/autoshift/settings.example.json` into the
project's `.pi/settings.json`, and run `/reload`. Verify the live roster and
model mapping with `/subagents-models`; see [the roster README](templates/default/.pi/agents/README.md) for roles, tiers, and execution rules.

Tier selection, escalation, review, and delivery policy live in the
`/autoshift` prompt and `docs/engineering/roles.md`, not in per-tier agent
files. Model ids are deployment configuration, deliberately absent from the
bundled prompts.

Optional specialist overlays are not installed by default; copy them
separately when needed:

- `templates/pi-notes` — `scribe` agent for session notes, changelogs, and ADR upkeep.
- `templates/pi-research` — the reverse-engineering pipeline (`re-capture`, `re-traffic`, `re-synthesis`), an explicitly requested research flow outside `/autoshift`.

Agent discovery is recursive, so optional agents must stay outside the default `.pi/agents/` directory to remain optional.

The monorepo dogfoods the default assets through root `.pi/agents` and `.pi/prompts` symlinks. Root `.pi` itself stays real so local settings and runtime state are not shared. Template payloads contain only reusable assets, never project-local Pi settings or session state.

The CLI's default-template overlay copies the default template's assets into generated projects as real files alongside the shared skills and docs. Standalone harness installs must likewise copy them rather than retain monorepo symlinks.

## Scope

This package only stores harness templates. It does not provide a CLI installer, scaffold command, boilerplate app, documentation app, deployment automation, or framework-specific variants.
