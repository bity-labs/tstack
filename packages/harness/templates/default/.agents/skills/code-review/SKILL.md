---
name: code-review
description: Review a GitHub pull request against the project's engineering doctrine and post the review as a PR comment. Use when the user says "review this PR", "code review", "review pull request", or provides a GitHub PR URL for review.
---

# Code Review

Review a GitHub pull request for correctness, maintainability, tests, domain fit, and operational risk. Always publish the review as a PR comment. The review itself never edits code and never merges; fixes are applied separately.

## Read These First

1. `docs/engineering/code-review.md` — review principles and checklist
2. `docs/coding-standards.md` — repo conventions
3. `docs/context.md` — domain language and project model
4. Relevant `docs/adr/` files for the area being touched
5. Other scoped engineering docs when risk requires it, such as security, data modeling, debugging, boundaries, legacy code, or testing

## Workflow

### 1. Identify the PR

If no PR URL is provided, ask the user for one.

Parse the URL into:

- repository owner/name
- PR number
- base branch
- head branch

Use GitHub CLI when available:

```bash
gh pr view <PR_URL> --json title,body,author,baseRefName,headRefName,files,commits,reviews
```

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

### 5. Write Findings

Each finding should be concrete and actionable.

For every issue, include:

- severity emoji: `🚫` blocker, `⚠️` important, or `💡` suggestion
- where it appears
- why it matters
- what should change

Do not block on personal preference. Distinguish required fixes from optional improvements.

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

### 7. Choose PR Status

GitHub labels are shared between issues and PRs, but these labels represent PR review state only. Keep only one active on the PR:

- `changes-requested` — use when the review has any 🚫 blocker or ⚠️ important improvement before merge; none of these findings is optional
- `ready-to-merge` — use only when the review accepts the PR as merge-ready and validation evidence is adequate

Remove the other status labels after reviewing. If the review cannot finish (missing checks, access, or context), keep `needs-review`, report the missing evidence, and never imply approval or resolve to a terminal status.

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

To publish without a review file, pipe the literal review markdown to `gh pr comment ... --body-file -` with a quoted heredoc delimiter. If `gh pr edit` fails with the installed CLI's deprecated `projectCards` error, use the `gh api` issue-labels endpoints for the same status-label add/remove; unrelated labels stay intact.

Then update the PR status label.

If changes are requested:

```bash
gh pr edit <PR_URL> --remove-label needs-review --remove-label ready-to-merge --add-label changes-requested
```

If ready to merge:

```bash
gh pr edit <PR_URL> --remove-label needs-review --remove-label changes-requested --add-label ready-to-merge
```

### 9. Report Back

Tell the user:

- review was posted, with the published comment URL and the review verdict
- status label applied
- short summary of the highest-risk finding, if any

## Guardrails

- Always read doctrine before reviewing the diff.
- Always publish the review as a PR comment.
- Never edit code as part of the review, and never merge; findings drive separate fixes.
- Do not invent project rules that are not in the docs.
- Do not block on style preference unless it violates documented conventions or creates real risk.
- If doctrine is missing, say what is missing and proceed with clearly labeled generic review criteria.
- For large PRs, state any areas not reviewed deeply.
