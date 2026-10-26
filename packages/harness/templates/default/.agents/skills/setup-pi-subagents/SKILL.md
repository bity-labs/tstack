---
name: setup-pi-subagents
description: Install and configure pi-subagents for a TStack harness project. Use when the user says "setup pi-subagents", "configure subagents", "install pi-subagents", or asks to prepare Pi delegation for this repository.
---

# Setup Pi Subagents

Prepare Pi delegation for this TStack harness project: install the
pi-subagents package, apply the harness role configuration, and verify the
roster. The host Pi must be version 1.2.0 or newer.

## Workflow

### 1. Check prerequisites

- Confirm `pi --version` is 1.2.0 or newer. Stop and ask the user to update Pi
  if it is older; do not guess compatibility.
- Confirm the project is trusted before project configuration applies.
- Confirm this repository uses the TStack harness (`AGENTS.md`,
  `docs/engineering/`, `.pi/agents/`).

### 2. Install the package

```sh
pi install npm:pi-subagents
```

Then run `/reload` and confirm discovery. Verify the live roster and model
mapping with:

```text
/subagents
/subagents-models
```

### 3. Apply the harness role configuration

Merge the harness contract from
`.pi/prompts/autoshift/settings.example.json` into the project's real
`.pi/settings.json`:

- Create `.pi/settings.json` if it does not exist.
- Preserve every existing key; merge only the `subagents` block.
- Do not write agent model IDs that this machine cannot resolve. Builtin
  agents inherit the parent session model by default; add
  `subagents.agentOverrides.<name>.model` only for the worker tiers the user
  approves, and verify each with `/subagents-models`.
- Keep the scout tool boundary strictly read-only (no `bash`, `edit`,
  `write`, `subagent`) and keep the reviewer's `edit`/`write` tools
  unavailable exactly as the example declares; the reviewer's `bash` is for
  inspection and `gh` review publication under its composed prompt policy.

Never edit agent prompt files to change tool, model, or acceptance behavior;
that configuration belongs in settings.

### 4. Verify

Run these checks and report each result:

1. `subagent({ action: "list" })` resolves `scout`, `worker`, `reviewer`, and
   the project `planner` without shadow warnings.
2. `/subagents-models reviewer` shows the configured skills, tools, and the
   effective model.
3. The resolved reviewer toolset has no `edit`, `write`, or `subagent`; it has
   `bash` for inspection and `gh` review publication, scoped by the composed
   prompt override and the `code-review` skill.
4. `subagent({ action: "doctor" })` reports no configuration errors.

Do not launch real children as part of setup. Report anything that cannot be
verified statically instead of assuming it works.

## Guardrails

- Do not copy bundled builtin agent definitions into `.pi/agents/`; project
  agents shadow builtins wholesale.
- Do not store personal API keys, tokens, or session state in the repository.
- Do not enable behaviors the user did not request, such as watchdogs,
  schedules, or merge automation.
