---
name: code-review
description: Review a GitHub pull request against the project's engineering doctrine and post the review as a PR comment. Use when the user says "review this PR", "code review", "review pull request", or provides a GitHub PR URL for review.
---

# Code Review

Review a GitHub pull request for correctness, maintainability, tests, domain fit, and operational risk. The requested PR workflow publishes the review as a PR comment, subject to the host's approval rules.

## Use and Context

Review the change without implementing fixes. See [invocation rules](../../invocation.md).

Read `docs/coding-standards.md` for the project's concrete rules before judging the diff, `docs/context.md` for business concepts, and relevant ADRs for architectural decisions. Load security, data, domain or legacy guides in `docs/engineering/` when that risk appears, not every guide before every diff.

## Review Criteria

- Match the stated issue/PRD and acceptance criteria; identify unrelated scope.
- Check observable behavior, edge cases, failure paths, data integrity and operational risk, not only code appearance.
- Read [test quality](../implement-with-tdd/reference/tests.md) when assessing coverage or test design.
- Invoke `designing-modules` when a finding depends on interface burden, responsibility or dependency direction. Do not block on a different aesthetic preference.
- Tie each finding to a concrete location, impact and actionable change. Use the severity model in step 5 and distinguish required fixes from suggestions.
- State missing evidence and uninspected areas. Reproduce suspected failures where practical to verify a finding; do not implement fixes during review.

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

### 2. Establish the Review Basis

Apply the project constraints and review criteria above. If a required project document is missing, state that limitation and label generic criteria as such; do not invent project rules.

### 3. Understand Intent

Before reading deeply, understand what the PR claims to do:

- PR title and body
- linked issue, PRD, or task if present
- stated acceptance criteria if present
- changed files and rough scope

Check whether the PR includes unrelated work. Unrelated scope is review risk.

### 4. Inspect the Change

Review the diff and surrounding callers against the criteria above. Establish that the risky path is present before reporting a hypothetical failure as an actual defect.

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

- `changes-requested` — use when the review has any blocker or required important improvement before merge
- `ready-to-merge` — use only when the review accepts the PR as merge-ready

Remove `needs-review` after reviewing either way.

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

- review was posted
- status label applied
- short summary of the highest-risk finding, if any

## Guardrails

- Apply the project rules and review criteria before judging the diff.
- Publish the review as a PR comment when carrying out this workflow; reading its criteria alone does not publish a review.
- Do not invent project rules that are not in the docs.
- Do not block on style preference unless it violates documented conventions or creates real risk.
- If doctrine is missing, say what is missing and proceed with clearly labeled generic review criteria.
- For large PRs, state any areas not reviewed deeply.
