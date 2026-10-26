---
name: code-review
description: 'Review a GitHub pull request against the project''s engineering doctrine. Inspection only: reports findings and a verdict without publishing or editing. Use when the user says "review this PR", "code review", "review pull request", or provides a GitHub PR URL for review.'
---

# Code Review

Review a GitHub pull request for correctness, maintainability, tests, domain fit, and operational risk. This skill inspects and reports only: it does not publish comments, change labels, or edit code. Publication is a separate `publish-review` step run by the caller.

## Read These First

1. `docs/engineering/code-review.md` — review principles and checklist
2. `docs/coding-standards.md` — repo conventions
3. `docs/context.md` — domain language and project model
4. Relevant `docs/adr/` files for the area being touched
5. Other scoped engineering docs when risk requires it, such as security, data modeling, debugging, boundaries, legacy code, or testing

## Workflow

### 1. Identify the PR

Work from what the caller supplies: the PR, the actual committed diff under review, the head/base revisions and target branch, and any validation evidence. When you can run commands, `gh pr view` and `gh pr diff` gather them.

### 2. Load Doctrine Before the Diff

Read the review doctrine before judging the change.

Use the TStack lowercase docs paths:

- `docs/engineering/code-review.md`
- `docs/coding-standards.md`
- `docs/context.md`
- `docs/adr/`

Do not review from generic taste. Review against the project's stated rules, vocabulary, and decisions.

### 3. Understand Intent

Before reading deeply, understand what the PR claims to do:

- PR title and body
- linked issue, PRD, or task if present
- stated acceptance criteria if present
- changed files and rough scope

Check whether the PR includes unrelated work. Unrelated scope is review risk.

### 4. Inspect the Change

Review the diff and surrounding code as needed.

Focus on:

- observable behavior and edge cases
- failure paths and data integrity
- test quality and missing coverage
- interface shape and module boundaries
- domain language consistency
- architectural decisions and ADR alignment
- operational, security, or migration risk
- unnecessary complexity or speculative abstraction

For large PRs, prioritize the highest-risk files first and mention any area you could not inspect confidently.

### 5. Check Validation

Note what validation evidence exists: tests run, CI status, or checks the caller reports. Treat missing validation as a finding, and do not assume unverified work passes.

### 6. Report Findings and Verdict

Keep the reporting agent's native review structure. When delegated, the builtin reviewer's own report stands verbatim: `Finding: P0/P1/P2` entries (issue, location, evidence, smallest fix), `Merge verdict: BLOCK, OK, or OK with notes`, or exactly `No issues found.` when nothing qualifies.

When reporting directly, use the same native shape:

- `P0` blocks merge; `P1` should be fixed before release; `P2` is a report-only note.
- End with one merge verdict: `BLOCK`, `OK`, or `OK with notes`. Missing validation evidence keeps the verdict from being plain `OK` — name the gap instead.
- Each finding is concrete and actionable. Do not block on personal preference.

Return the report with the reviewed head/base revisions to the caller. Do not publish, label, or fix.

## Guardrails

- Always read doctrine before reviewing the diff.
- Do not publish comments or labels; that is `publish-review` work.
- Do not invent project rules that are not in the docs.
- Do not block on style preference unless it violates documented conventions or creates real risk.
- If doctrine is missing, say what is missing and proceed with clearly labeled generic review criteria.
- For large PRs, state any areas not reviewed deeply.
