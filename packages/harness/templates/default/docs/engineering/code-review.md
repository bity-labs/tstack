---
title: Code Review
---

## Principle

Review should protect correctness, maintainability, and operational safety while keeping feedback specific, actionable, and proportional to risk.

## Rules

- Review against the stated intent first. Confirm the change solves the requested problem and avoids unrelated work.
- Check observable behavior, edge cases, and failure paths, not only whether the code looks clean.
- Evaluate test quality. Tests should prove behavior through stable interfaces and include regression coverage for bugs.
- Watch for complexity: leaky interfaces, shallow modules, duplicated knowledge, hidden dependencies, and overbroad abstractions.
- Check domain language against `docs/context.md` when business concepts are involved.
- Check ADRs when the change touches an existing architectural decision.
- Load scoped engineering docs when risk requires it: security, production, data, legacy, debugging, or boundaries.
- Prefer concrete comments tied to a line, behavior, or risk. Avoid vague style opinions.
- Distinguish blockers from suggestions. Do not block on personal preference.

## Review Checklist

- Does the change match the issue, PRD, or requested behavior?
- Are important success, edge, and failure paths tested?
- Is the design simpler or at least not more complex than necessary?
- Are naming and domain concepts consistent with project language?
- Are security, data, and production risks considered where relevant?
- Is the change small enough to review confidently?

## Delegated PR Reviews

When a PR review is delegated, the parent coordinates three steps: hand the reviewer the exact PR, the actual committed diff under review, revisions, and any available validation evidence (the reviewer has no shell); run the `code-review` skill and collect the findings and verdict; then delegate `publish-review`, which verifies the head, base, and target branch are still current, posts the comment, and sets the status label. Report the comment URL to the user.

The parent resolves missing validation evidence or reports the blocker; it never upgrades an incomplete review to approval. `publish-review` translates the completed verdict conservatively (`BLOCK` to `changes-requested`; `OK`, `No issues found.`, and `OK with notes` with only non-blocking notes to `ready-to-merge`; incomplete validation never approves) and never re-judges findings. Children do not delegate further, and publication never merges. This is ordinary sequential delegation — the parent keeps product decisions and can review small PRs directly. Fixing findings, including PR worktree handling, remains `fix-code-review` work.
