# Pi Sub-Agents Roster

[pi-subagents](https://pi.dev/packages/pi-subagents) agent definitions for a
tiered OpenAI sub-agent roster using the GPT-6 family. Drop `.pi/agents/` at
the project root; Pi discovers them automatically (`pi install npm:pi-subagents`
required).

## Roster

| Agent | Model | Thinking | Role |
|---|---|---|---|
| `planner` | gpt-6.1-sol | high | Returns tiered task drafts to the parent for approval and dispatch |
| `dev-t1` | gpt-6-luna | off | Mechanical/spec-faithful work (CRUD on documented codebase) |
| `dev-t2` | gpt-6.1-sol | medium | Standard feature dev (Next.js, API wiring) |
| `dev-t3` | gpt-6.1-sol | xhigh | Hard-surface dev within approved decisions (Expo/RN, migrations, auth, offline) |
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

- `planner` → `break-into-issues`, `issues-triage`
- `scout` → `understand-codebase`
- `dev-t*` → `implement-with-tdd` (+ `debug`, `refactor-safely` on t3)
- `reviewer` → `code-review`
- `re-synthesis` → `write-prd`

The RE pipeline's output (from `re-synthesis`) is a draft in the `write-prd`
format. The parent resolves product decisions and obtains approval before
publication and task breakdown; inferred behavior is not an approved spec.

## Autonomous child contract

All ten agents run unattended within a bounded parent-assigned task. Autonomy
means executing that task without routine user interaction, not inventing
requirements, bypassing approval, or launching more agents.

The parent supplies the goal, source inputs (including PRD/issue content),
allowed scope, acceptance criteria, output destination, and already-approved
decisions. Children resolve routine details from repository evidence and return:

- `DONE` or `BLOCKED` (completion status, separate from a review verdict)
- results and artifact paths, including useful partial work
- validation commands/results or why validation was not possible
- residual risks and, when blocked, the exact missing decision/input/access

A missing required decision, permission, or access causes a `BLOCKED` handoff,
not a user interview or a waiting approval loop. The parent owns human
interaction, approvals, GitHub publication/labels, dispatch, and escalation.

### Skill execution boundaries

Skills remain reusable harness guidance; this roster does not alter them.
Each agent prompt defines which stages belong in its unattended task:

- `dev-t*`: use `implement-with-tdd` in AFK mode. t2 does not use
  `clarify-with-context`; contradictory requirements return to the parent.
- `dev-t3`: use the unattended paths of `debug` and `refactor-safely`. Missing
  reproduction access or unclear refactor scope returns `BLOCKED`.
- `planner`: use task-drafting and readiness guidance only. Return proposed
  AFK/HITL slices, dependencies, and tiers; do not ask for approval, publish
  issues, or dispatch. The parent gets approval of the breakdown before acting.
- `re-synthesis`: use the PRD template/drafting guidance only; return artifacts,
  not a published issue. Unresolved decisions remain explicit blockers.
- `reviewer`: use inspection and review-format guidance only; return findings
  and `APPROVE`/`CHANGES` to the parent. Do not publish, change labels, or fix code.
- `scout`: investigate the assigned area without a clarification interview.

## Escalation rule

The parent may route ready implementation tasks through
`dev-t1 (luna) → dev-t2 (sol/medium) → dev-t3 (sol/xhigh)`.
After two unsuccessful corrective attempts at the same acceptance criterion,
the dev returns `BLOCKED` with accumulated notes, attempted fixes, and validation
output. An expected TDD RED is not a failed attempt. Missing access or runtime
infrastructure failure blocks immediately rather than consuming code retries.
No child launches its successor or changes its own effort.

The planner recommends tiers; the parent assigns them at dispatch. Unresolved
product or architecture decisions are HITL blockers, not a reason to send an
underspecified task to t3. Unresolved t3 work returns to the parent for a decision.
The reviewer is an independent gate after implementation, not a fourth dev tier.
The parent routes review fixes to a writer and requests review of the updated diff.

## Model assumptions

Model IDs assume an OpenAI provider prefix (`openai/<id>`) configured in Pi.
Verify after install:

```
/subagents-models
```

Adjust `model:` lines if your provider naming differs.
