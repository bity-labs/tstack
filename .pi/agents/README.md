# Pi Sub-Agents Roster

[pi-subagents](https://pi.dev/packages/pi-subagents) agent definitions for a
tiered OpenAI sub-agent roster using the GPT-6 family. Drop `.pi/agents/` at
the project root; Pi discovers them automatically (`pi install npm:pi-subagents`
required).

## Roster

| Agent | Model | Thinking | Role |
|---|---|---|---|
| `orchestrator` | gpt-6.1-sol | high | Splits PRDs into tiered tasks, dispatches to devs |
| `dev-t1` | gpt-6-luna | off | Mechanical/spec-faithful work (CRUD on documented codebase) |
| `dev-t2` | gpt-6.1-sol | medium | Standard feature dev (Next.js, API wiring) |
| `dev-t3` | gpt-6.1-sol | xhigh | Ambiguous/native dev (Expo/RN, migrations, auth, offline) |
| `reviewer` | gpt-6-astra | xhigh | Final review gate (correctness, security) |
| `scout` | gpt-6-luna | low | Read-only recon, cheap |
| `scribe` | gpt-6-luna | off | Session notes, changelog, ADR upkeep |

Reverse-engineering pipeline (understand an existing app from user flow to DB):

| Agent | Model | Thinking | Stage |
|---|---|---|---|
| `re-capture` | gpt-6-luna | low | 1 — screen/state/asset capture, no interpretation |
| `re-traffic` | gpt-6.1-sol | high | 2 — infer API surface from traffic captures |
| `re-synthesis` | gpt-6-astra | xhigh | 3 — merge into clone PRD + OpenAPI + schema |

## TStack integration

Agents pin TStack harness skills by name in `skills:` frontmatter — the skills
resolve from the harness's `.agents/skills/` layout (Pi-standard `<name>/SKILL.md`).

- `orchestrator` → `break-into-issues`, `issues-triage`
- `scout` → `understand-codebase`
- `dev-t*` → `implement-with-tdd` (+ `debug`, `refactor-safely` on t3)
- `reviewer` → `code-review`
- `re-synthesis` → `write-prd`

The RE pipeline's output (from `re-synthesis`) is written in the `write-prd`
format so it flows straight back into `break-into-issues` and the tiered
dispatch loop.

## Escalation rule

`dev-t1 (luna) → dev-t2 (sol/medium) → dev-t3 (sol/xhigh) → reviewer (astra)`.
A dev agent escalates after two failures with its accumulated notes; it never
retries silently and never lowers effort on its own. Tier is assigned per task
by the orchestrator, tagged in the task spec.

## Model assumptions

Model IDs assume an OpenAI provider prefix (`openai/<id>`) configured in Pi.
Verify after install:

```
/subagents-models
```

Adjust `model:` lines if your provider naming differs.
