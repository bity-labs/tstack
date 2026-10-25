---
title: Role Assignment
---

## Principle

Pi builtin subagents perform bounded roles. Reusable harness assets define what evidence each role must produce, while one worker at a time performs implementation.

## Rules

- Treat `scout`, `worker`, `reviewer`, `oracle`, and `delegate` as capability presets, not personas with implicit authority. Configure the tool, skill, and acceptance boundaries for each deployment.
- Configure builtin agents with `subagents.agentOverrides` in user or project Pi settings instead of copying their definitions into `.pi/agents/`. A project agent that shadows a builtin replaces it wholesale and stops inheriting upstream improvements.
- Implementation is a single-writer activity: one worker per cwd or managed worktree at a time. Parallelize reading, review, and validation; serialize conflicting writes.
- Give workers fresh context for implementation and reviewers fresh context for independent review. Fork context only when the child genuinely needs the parent conversation history.
- Keep review verdicts separate from execution status. A successfully completed review can still return `CHANGES`; a worker returning success without edits or validation evidence is not a completed task.
- Use explicit verification commands or acceptance evidence for writers. An elapsed timeout is not a mutation-safe boundary; request a checkpoint instead of relying on a kill.
- Escalate implementation effort deliberately: a retained child keeps its original model and tool contract, so a different effort tier starts a new bounded writer with the preserved worktree, partial work, findings, and attempt history.
- Children never launch further subagents unless the parent explicitly delegated fanout and their tool contract includes `subagent`.

## Checklist

- Does each delegated role have explicit tool and skill boundaries in configuration?
- Is exactly one writer active per worktree?
- Do review contracts require findings against the exact head and base under review?
- Are completion status and review verdict recorded separately?
- Is escalation evidence preserved across writer replacement?
