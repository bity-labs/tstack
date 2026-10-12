# Pi Sub-Agents Roster

[pi-subagents](https://pi.dev/packages/pi-subagents) agent definitions for a
tiered OpenAI sub-agent roster using the GPT-6 family. Drop `.pi/agents/` at
the project root; Pi discovers them automatically (`pi install npm:pi-subagents`
required).

## Roster

| Agent | Model | Thinking | Role |
|---|---|---|---|
| `planner` | gpt-6.1-sol | high | Plans execution order, tiers, and safe batches across existing PRD tasks |
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

## Workflow: preparation first, delegation at implementation

The normal product workflow has two separate phases:

1. **Interactive preparation — user + main agent, no subagents:** clarify the
   feature, write the PRD, split it into task issues, and approve the scope.
2. **Implementation — /autoshift:** the main agent may invoke
   `planner` to inspect the existing approved tasks and current code, check
   readiness/dependencies, recommend dev tiers, and propose execution batches.
   The main agent then dispatches workers and reviewers and owns integration
   and escalation. Routine execution planning inside approved scope does not
   require another approval round; new product decisions return to the user.

For one clear, independent task, the main agent can choose the initial dev tier
directly. Use `planner` for execution planning when dependency ordering, parallel
batches, or competing work need coordination. The planner never authors PRDs,
re-splits tasks, or creates issues. During a running shift, checkpoint-only
planner passes also relay fresh parent state through the native supervisor
channel; this is not nested delegation or a user approval interview.
The RE pipeline is separate, explicitly requested research—not an automatic
step during interactive product preparation.

### One command: /autoshift

The project prompt `.pi/prompts/autoshift.md` includes its complete execution
protocol; no separate protocol file is needed. Use it alongside this roster and
the harness skills/docs. Pi discovers project prompts after project trust; use
`/reload` after adding or changing the prompt.

```text
/autoshift #140 #170
/autoshift --tasks #102 #103
/autoshift --dry-run #140 #170
/autoshift --merge --concurrency=3 #140 #170
/autoshift --destination-branch=shift-integration #140 #170
```

- Default inputs are PRDs; `--tasks` selects existing task issues directly.
- Default delivery is reviewed PRs, not automatic merge. `--merge` authorizes
  gated delivery to default and closure of accepted selected work.
- A destination branch authorizes child integration there; its reviewed aggregate
  PR remains open unless `--merge` is also supplied. Open child issues do not
  prevent integration progress: default-branch delivery and issue closure are
  separate from destination-branch integration.
- Defaults are two concurrent actions and three review dispatches per PR. Resume
  preserves counters and reconciles existing runs/PRs instead of starting over.
- Without merge authority or a destination branch, tasks depending on unmerged
  prerequisites wait for integration rather than building on unreviewed branches.
- One controlling session per repository; no crash-safe replay or cross-session
  locking is claimed. The protocol includes a disposable-repo smoke checklist.

This replaces the personal `/nightshift` and `/auto-shift` workflows for this
project; no legacy command aliases are shipped. Existing files in
`~/.pi/agent/prompts/` are not modified or removed by this PR. Use `/autoshift`
here and archive those personal commands separately if desired.

### Multi-PRD execution note

The user may start implementation across **multiple PRDs at once**. This is the
planner's main coordination use case: return one execution plan covering every
existing task in the selected PRDs, not unrelated per-PRD queues.

The main agent supplies PRD/task content and stable references, priorities,
acceptance criteria, dependency/completion state, active assignments/worktrees,
and worker capacity. The planner then:

- Tracks each task back to its source PRD/repository, including ready, dependent,
  active, complete, and blocked work.
- Checks cross-PRD dependencies, shared prerequisites, cycles, and duplicate or
  overlapping tasks without silently changing the approved task breakdown.
- Recommends dev tiers and bounded parallel batches; serializes shared-file,
  contract, migration, or resource conflicts. Separate worktrees alone do not
  make those conflicts safe.
- Preserves active assignments and keeps independent work runnable when another
  PRD is blocked. Replanning uses fresh parent-supplied state and changes only
  pending work, not tasks already in flight.
- Includes review/integration checkpoints before dependents start; worker DONE
  is not proof that a prerequisite is accepted and present in their baseline.

**Planning is centralized; dispatch stays flat.** The planner returns the plan
and blockers to the main agent, which owns launches, worktree isolation, review,
integration, and escalation. It does not spawn workers or become a second
orchestrator. No claim is made that these prompts implement a runtime scheduler.

## TStack integration

Specialists pin TStack harness skills by name in `skills:` frontmatter — the
skills resolve from the harness's `.agents/skills/` layout (Pi-standard
`<name>/SKILL.md`). The execution planner uses its own read-only planning
contract, not the `break-into-issues` or `issues-triage` authoring workflows.

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
- `planner`: inspect existing approved tasks across the selected PRDs and return
  execution order, readiness, dependencies, tiers, and safe batches. Do not
  re-split the PRDs, create issues, ask for routine approval, or dispatch.
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
