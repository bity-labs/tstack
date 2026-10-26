# Pi Sub-Agents Roster

[pi-subagents](https://pi.dev/packages/pi-subagents) (Pi 1.2.0+) agent
configuration for a tiered, builtin-based sub-agent roster. Drop `.pi/agents/`
at the project root; Pi discovers them automatically (`pi install
npm:pi-subagents` required). Configure with
`.agents/skills/setup-pi-subagents/SKILL.md`.

## Roster

| Agent | Source | Role |
|---|---|---|
| `scout` | Builtin, configured read-only via `subagents.agentOverrides` | Read-only recon per the `understand-codebase` skill |
| `worker` | Builtin, configured per `subagents.agentOverrides` | Implementation at a selected effort tier; the single writer |
| `reviewer` | Builtin, configured via `subagents.agentOverrides` | Publishes the review comment and status label via the `code-review` skill; no source mutation |
| `planner` | Project agent (`.pi/agents/planner.md`) | Execution planning for existing approved tasks across one or multiple PRDs |
| `oracle`, `delegate`, `researcher`, `evidence-auditor` | Builtin | Optional: second opinions, bounded delegation, web research, evidence audit |
| `scribe` | Optional overlay (`templates/pi-notes`) | Session notes, changelog, ADR upkeep (not installed by default) |

Builtin agents inherit the parent session model unless
`subagents.agentOverrides.<name>.model` or a per-launch model override selects
one. Verify the live mapping with `/subagents-models`.

## Implementation tiers

Tier selection is dispatch policy in `.pi/prompts/autoshift.md`, not a set of
agent files. The controller dispatches builtin `worker` children with a
per-launch model/effort override or configured overrides:

| Tier | Task shape | Typical thinking |
|---|---|---|
| 1 | Mechanical, tightly specified changes (CRUD on a documented codebase) | low |
| 2 | Standard feature dev (Next.js, API wiring) | medium |
| 3 | Hard-surface dev within approved decisions (migrations, auth, offline, platform divergence) | xhigh |

Escalation runs `tier 1 → tier 2 → tier 3`; a tier change starts a new bounded
writer (a retained child keeps its original model and tool contract). The
planner recommends tiers; the parent assigns them at dispatch.

## Role configuration

`.pi/prompts/autoshift/settings.example.json` is the deployment contract:

- `scout` keeps a strict read-only tool boundary (`read`, `grep`, `find`, `ls`,
  `contact_supervisor`); no `bash`, `edit`, `write`, or `subagent`.
- `reviewer` gets read/search tools plus `bash` for inspection and normal `gh`
  review publication through the `code-review` skill; `edit`/`write` stay
  unavailable, and the no-source-mutation rule is a composed-prompt policy
  boundary, not enforced filesystem isolation.
- `worker` has implementation tools plus `implement-with-tdd` and the
  `writer` acceptance role.
- Model ids are intentionally absent; configure them per project.

Merge this into the project's real `.pi/settings.json`; the template never
ships live settings.

## Reverse-engineering pack (not installed by default)

A reverse-engineering pipeline (understand an existing app from user flow to
DB) ships as a separate optional overlay (`templates/pi-research`) and is not
part of the default roster. Its stages:

1. App surface capture — screens, states, assets, no interpretation
2. API inference from traffic captures — endpoints, shapes, auth
3. Synthesis — clone PRD + OpenAPI + schema draft, parent-approved

Do not invoke RE stages during interactive product preparation or
`/autoshift`.

## Workflow: preparation first, delegation at implementation

The normal product workflow has two separate phases:

1. **Interactive preparation — user + main agent, no subagents:** clarify the
   feature, write the PRD, split it into task issues, and approve the scope.
2. **Implementation — /autoshift:** the main agent may invoke
   `planner` to inspect the existing approved tasks and current code, check
   readiness/dependencies, recommend tiers, and propose execution batches.
   The main agent then dispatches workers and reviewers and owns integration
   and escalation. Routine execution planning inside approved scope does not
   require another approval round; new product decisions return to the user.

For one clear, independent task, the main agent can choose the initial tier
directly. Use `planner` for execution planning when dependency ordering, parallel
batches, or competing work need coordination. The planner never authors PRDs,
re-splits tasks, or creates issues. During a running shift, checkpoint-only
planner passes also relay fresh parent state through the native supervisor
channel; this is not nested delegation or a user approval interview.

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
- Recommends implementation tiers and bounded parallel batches; serializes
  shared-file, contract, migration, or resource conflicts. Separate worktrees
  alone do not make those conflicts safe.
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

Role, tool, skill, and model boundaries are deployment configuration
(`subagents.agentOverrides`), not prompt edits; `docs/engineering/roles.md`
records the policy. Skills resolve from the harness's `.agents/skills/`
layout (Pi-standard `<name>/SKILL.md`). The execution planner uses its own
read-only planning contract, not the `break-into-issues` or `issues-triage`
authoring workflows.

- `scout` → `understand-codebase`
- `worker` → `implement-with-tdd` (tier 3 adds `debug`, `refactor-safely`)
- `reviewer` → `code-review` (publishes the review comment and status label,
  then returns the URL, verdict, and findings to the parent)
- Optional RE synthesis → `write-prd` drafting guidance only

The reviewer publishes its review through the full `code-review` workflow and
returns the comment URL. The parent resolves product
decisions, verifies the published review, and obtains approval before further
breakdown and tiered
dispatch; inferred behavior is not an approved spec.

## Autonomous child contract

All agents run unattended within a bounded parent-assigned task. Autonomy
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
interaction, approvals, dispatch, integration, and escalation; the reviewer
publishes its final assessment (review comment and status label) through the
`code-review` skill before returning, and the parent verifies the settled
result without publishing a duplicate.

### Skill execution boundaries

Skills remain reusable harness guidance; this roster does not alter them.
Delegation contracts define which stages belong in an unattended task:

- `worker`: use `implement-with-tdd` in AFK mode. Tier-3 work may use the
  unattended paths of `debug` and `refactor-safely`; missing reproduction
  access or unclear refactor scope returns `BLOCKED`. `clarify-with-context`
  is not part of AFK implementation; contradictory requirements return to the
  parent.
- `planner`: inspect existing approved tasks across the selected PRDs and return
  execution order, readiness, dependencies, tiers, and safe batches. Do not
  re-split the PRDs, create issues, ask for routine approval, or dispatch.
- `reviewer`: run the `code-review` workflow end to end — inspect, classify,
  publish the comment and exactly one status label, and return the URL,
  verdict, and findings. The no-source-mutation rule (no edit, stage, commit,
  push; never merge) is a policy boundary, not enforced filesystem isolation;
  bash exists for inspection and the skill's `gh` publication commands only.
- `scout`: investigate the assigned area without a clarification interview.

## Escalation rule

The parent may raise the effort tier of ready implementation tasks through
`tier 1 → tier 2 → tier 3`. After two unsuccessful corrective attempts at the
same acceptance criterion, the writer returns `BLOCKED` with accumulated notes,
attempted fixes, and validation output. An expected TDD RED is not a failed
attempt. Missing access or runtime infrastructure failure blocks immediately
rather than consuming code retries. No child launches its successor or changes
its own effort.

The planner recommends tiers; the parent assigns them at dispatch. Unresolved
product or architecture decisions are HITL blockers, not a reason to send an
underspecified task to tier 3. Unresolved tier-3 work returns to the parent for
a decision. The reviewer is an independent gate after implementation, not a
fourth tier. The parent routes review fixes to a writer and requests review of
the updated diff.
