---
name: code-review
description: Review a GitHub pull request against the project's engineering doctrine and post the review as a PR comment. Use when the user says "review this PR", "code review", "review pull request", or provides a GitHub PR URL for review.
---

# Code Review

Review a GitHub pull request for correctness, maintainability, tests, domain
fit, and operational risk. Always publish the review as a PR comment.

This is the user-facing end-to-end workflow. The inspection procedure is shared
with the `review-change` skill: run `review-change` for the doctrine load,
intent check, inspection, and findings format, then publish the result per this
skill. Do not duplicate the inspection methodology here or in agents.

## Read These First

1. The `review-change` skill — the shared inspection procedure this workflow
   reuses before publication
2. `docs/engineering/code-review.md` — review principles and checklist
3. `docs/coding-standards.md` — repo conventions
4. `docs/context.md` — domain language and project model
5. Relevant `docs/adr/` files for the area being touched

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

### 2. Inspect with review-change

Run the `review-change` workflow against the identified PR revision:

- load doctrine before the diff,
- understand the PR's stated intent and acceptance criteria,
- inspect the change and classify findings (`blocker`, `required`,
  `suggestion`), and
- reach an `APPROVE`, `CHANGES`, or `BLOCKED` verdict with evidence.

Do not inspect from generic taste. Review against the project's stated rules,
vocabulary, and decisions.

### 3. Format the Review

Use the `review-change` findings (including what the PR does well and test
coverage notes) in this publication format:

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

### 4. Choose PR Status

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

### 5. Publish the Review

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

### 6. Report Back

Tell the user:

- review was posted
- status label applied
- short summary of the highest-risk finding, if any

## Guardrails

- Always run the `review-change` inspection before publishing anything.
- Always publish the review as a PR comment.
- Do not invent project rules that are not in the docs.
- Do not block on style preference unless it violates documented conventions or creates real risk.
- If doctrine is missing, say what is missing and proceed with clearly labeled generic review criteria.
- For large PRs, state any areas not reviewed deeply.
