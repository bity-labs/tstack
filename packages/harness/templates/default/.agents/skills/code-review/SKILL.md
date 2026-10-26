---
name: code-review
description: Review a GitHub pull request against the project's engineering doctrine and publish the review as a PR comment with a status label. Use when the user says "review this PR", "code review", "review pull request", provides a GitHub PR URL, or when a reviewer subagent is dispatched to publish a review.
---

# Code Review

The single review workflow for this harness: inspect a change against the
project's engineering doctrine, classify findings, and publish the review as a
PR comment with exactly one PR status label. It serves two callers with the
same steps: the interactive main agent, and a reviewer subagent dispatched by
the controller during `/autoshift` (the subagent publishes through this skill
and returns the comment URL, verdict, and findings; the controller verifies the
published review instead of duplicating it).

## Reviewer-subagent boundary

When this skill runs inside a reviewer subagent, shell access exists for
inspection and publication, so the no-mutation rule is a policy boundary, not
an enforced filesystem restriction. The reviewer must:

- run `bash` only for read-only inspection commands and the exact `gh`
  publication and label commands in this skill;
- never edit, stage, commit, or push source changes — fixes are the writer's
  job, dispatched by the controller;
- never merge, rebase, force-push, bypass branch protection, or attempt a
  formal PR approval (`gh pr review --approve` is not part of this workflow);
- publish the normal review comment and exactly one status label, then return
  the published comment URL, verdict, findings, and validation evidence.

## Read These First

1. `docs/engineering/code-review.md` — review principles and checklist
2. `docs/engineering/security-review.md` when the change touches auth,
   permissions, secrets, user input, redirects, or data exposure
3. `docs/engineering/testing.md` and `docs/engineering/tdd.md` when judging
   test quality or coverage
4. `docs/coding-standards.md` — repo conventions
5. `docs/context.md` — domain language and project model
6. Relevant `docs/adr/` files for the area being touched

## Workflow

### 1. Identify the PR and pin the revision

If no PR URL is provided, ask the user for one. Use GitHub CLI when available:

```bash
gh pr view <PR_URL> --json title,body,author,baseRefName,headRefName,headRefOid,files,commits,reviews
```

Confirm and record the exact revision under review: repository owner/name, PR
number, head SHA, head branch, and target base branch. Review only that
revision. A changed head, base, or target invalidates the review until it is
re-inspected. `watchdog_diff` does not inspect committed ranges; for committed
work, require a supplied diff artifact instead of claiming a commit was
reviewed.

### 2. Load doctrine before the diff

Read the review doctrine before judging the change. Do not review from generic
taste; review against the project's stated rules, vocabulary, and decisions.

### 3. Understand intent

Read the PR title, body, linked issue, PRD, or task, and the stated acceptance
criteria. Check whether the PR includes unrelated work. Unrelated scope is
review risk.

### 4. Inspect the change

Review the diff and surrounding code as needed. Focus on:

- observable behavior and edge cases
- failure paths and data integrity
- test quality and missing coverage
- interface shape and module boundaries
- domain language consistency
- architectural decisions and ADR alignment
- operational, security, or migration risk
- unnecessary complexity or speculative abstraction

For large PRs, prioritize the highest-risk files first and mention any area
that could not be inspected confidently. If a required inspection cannot run
(missing checks, unavailable tests, insufficient access), report it as missing
evidence. Missing evidence is not a passing check.

### 5. Classify findings

Each finding states where it appears, why it matters, and the smallest fix.
Classify each as:

- `blocker` — correctness, security, or spec violation that must be fixed
  before merge
- `required` — must be addressed before merge/acceptance; lower severity than
  a blocker, but never optional
- `suggestion` — non-blocking improvement

Do not block on personal preference. Distinguish required fixes from optional
improvements. If doctrine is missing, say what is missing and proceed with
clearly labeled generic review criteria.

### 6. Format the Review

Use this format:

```md
## Summary
<short assessment of what the PR does and whether it is close to mergeable>

## Blockers
- 🚫 <issue, impact, and required fix>

## Important Improvements
- ⚠️ <issue, impact, and recommended fix>

## Suggestions
- 💡 <non-blocking improvement>

## Tests / Coverage
<what is covered, what is missing, and whether coverage is acceptable>

## What Works Well
<call out strong choices briefly>
```

If a section has no items, write `None`.

### 7. Map the Verdict to a PR Status (fail closed)

GitHub labels are shared between issues and PRs, but these labels represent PR review state only. Keep only one active on the PR. Map the verdict explicitly:

- `APPROVE` — no unresolved blockers or required findings and adequate
  validation evidence. Set `ready-to-merge` only when that evidence is
  adequate; missing or unavailable checks keep `needs-review` and the gaps are
  reported instead.
- `CHANGES` — any blocker or required finding (all required findings are
  mandatory before merge/acceptance). Set `changes-requested`.
- `BLOCKED` — the review could not finish. Publish the missing evidence, keep
  or set `needs-review`, and treat this as an incomplete review: never set
  `ready-to-merge` (or `changes-requested`) from a blocked review, and do not
  report it as a finished review. Escalate the exact missing inputs or access.

Ensure labels exist before applying them:

```bash
gh label create needs-review --repo <owner/repo> --description "PR status: ready and waiting for review" --color 5319E7 2>/dev/null || true
gh label create changes-requested --repo <owner/repo> --description "PR status: reviewed and requires changes before merge" --color D73A4A 2>/dev/null || true
gh label create ready-to-merge --repo <owner/repo> --description "PR status: reviewed and ready to merge" --color 0E8A16 2>/dev/null || true
```

### 8. Publish the Review

Always post the review as a PR comment. Do not only print it locally.

```bash
gh pr comment <PR_URL> --body-file <review-file>
```

Then update the PR status label according to the verdict mapping.

If changes are requested:

```bash
gh pr edit <PR_URL> --remove-label needs-review --remove-label ready-to-merge --add-label changes-requested
```

If ready to merge:

```bash
gh pr edit <PR_URL> --remove-label needs-review --remove-label changes-requested --add-label ready-to-merge
```

If the review is blocked, do not change the status labels to a terminal PR
state: ensure `needs-review` is set and publish the missing evidence as the
comment's opening section.

### 9. Report Back

Tell the caller:

- the published comment URL
- the verdict (`APPROVE`, `CHANGES`, or `BLOCKED`)
- the findings summary and the applied status label
- short summary of the highest-risk finding, if any

The controller verifies the published review and owns any follow-up dispatch;
it never publishes a duplicate comment.

## Guardrails

- Always read doctrine before reviewing the diff.
- Always publish the review as a PR comment.
- Never mutate source code, the index, branches, or GitHub protection state;
  never merge.
- Do not invent project rules that are not in the docs.
- Do not block on style preference unless it violates documented conventions or creates real risk.
- If doctrine is missing, say what is missing and proceed with clearly labeled generic review criteria.
- For large PRs, state any areas not reviewed deeply.
