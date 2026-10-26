---
name: publish-review
description: Publish a completed code review as a GitHub PR comment and set the PR status label. Use after a review has finished and its findings are final, or when asked to post or publish a review.
---

# Publish Review

Publish an already-completed review as a PR comment and set the PR status label. Do not re-review, add findings, or upgrade the verdict.

## Inputs

Require from the caller:

- the completed review findings and verdict (`ready-to-merge` or `changes-requested`)
- repository (`owner/name`) and PR number or URL
- the head and base revisions the review covered

If the findings are incomplete or carry no clear verdict, stop and return them to the caller. Missing evidence cannot become approval.

## Workflow

### 1. Verify the Revision Is Current

```bash
gh pr view <PR_URL> --json headRefOid,baseRefName
```

If the head revision differs from the reviewed one, stop and return the review to the caller for re-review. Never publish stale findings.

### 2. Check for a Prior Publication

If a previous attempt may already have posted, check the PR's latest comments before retrying:

```bash
gh api repos/<owner>/<repo>/issues/<number>/comments --jq '.[-1].body'
```

Publish only when the review is not already there. Never post the same review twice.

### 3. Format the Review

Use this format; publish findings that already use it verbatim:

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

## Verdict
<`changes-requested` or `ready-to-merge`, with the deciding reason>
```

If a section has no items, write `None`.

### 4. Publish the Comment

Pipe the review to `gh`; literal stdin works without a file:

```bash
gh pr comment <PR_URL> --body-file -
```

### 5. Set the Status Label

GitHub labels are shared between issues and PRs, but these labels represent PR review state only. Keep only one active on the PR, derived from the verdict, not re-judged:

- `changes-requested` — the verdict is `changes-requested`
- `ready-to-merge` — the verdict is `ready-to-merge`

Ensure labels exist before applying them:

```bash
gh label create needs-review --repo <owner/repo> --description "PR status: ready and waiting for review" --color 5319E7 2>/dev/null || true
gh label create changes-requested --repo <owner/repo> --description "PR status: reviewed and requires changes before merge" --color D73A4A 2>/dev/null || true
gh label create ready-to-merge --repo <owner/repo> --description "PR status: reviewed and ready to merge" --color 0E8A16 2>/dev/null || true
```

If changes are requested:

```bash
gh pr edit <PR_URL> --remove-label needs-review --remove-label ready-to-merge --add-label changes-requested
```

If ready to merge:

```bash
gh pr edit <PR_URL> --remove-label needs-review --remove-label changes-requested --add-label ready-to-merge
```

If `gh pr edit` fails on a project-managed PR (known `projectCards` issue), fall back to the issues API, retaining unrelated labels:

```bash
keep=$(gh api repos/<owner/repo>/issues/<number> --jq '[.labels[].name] | map(select(. != "needs-review" and . != "changes-requested" and . != "ready-to-merge"))')
gh api repos/<owner/repo>/issues/<number> -X PUT --input - <<< "$(jq -n --argjson keep "$keep" --arg status <status-label> '{labels: $keep + [$status]}')"
```

### 6. Report Back

Tell the caller:

- the comment URL printed by `gh pr comment`
- the status label applied

## Guardrails

- Publish only what the review concluded. Never re-review, invent findings, or upgrade a verdict.
- No source edits and no merges.
- Verify the revision before publishing; a stale revision returns for re-review.
- Check for an ambiguous prior publication before retrying a failed publish.
