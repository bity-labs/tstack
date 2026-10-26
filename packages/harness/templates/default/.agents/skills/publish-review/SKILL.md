---
name: publish-review
description: Publish a completed code review as a GitHub PR comment and set the PR status label. Use after a review has finished and its findings are final, or when asked to post or publish a review.
---

# Publish Review

Publish an already-completed review as a PR comment and set the PR status label. Do not re-review, add findings, or upgrade the verdict.

## Inputs

Require from the caller:

- the completed review findings and verdict
- repository (`owner/name`) and PR number or URL
- the head revision, base revision, and target branch the review covered

If the findings are incomplete or carry no clear verdict, stop and return them to the caller. Missing evidence cannot become approval.

## Workflow

### 1. Verify the Review Identity Is Current

```bash
gh pr view <PR_URL> --json headRefOid,baseRefOid,baseRefName
```

Compare the head SHA, base SHA, and base branch against the review's identity. If any differ — new commits, changed base, or a retargeted PR — stop and return the review to the caller for re-review. Never publish stale findings.

### 2. Check for a Prior Publication

Retrieve candidate bodies and URLs from all pages, not just the latest:

```bash
gh api repos/<owner>/<repo>/issues/<number>/comments --paginate --jq '.[] | [.html_url, .body] | @tsv'
```

A candidate is this publication only when its body carries the supplied review's findings and the identity line `Reviewed at <head-sha> on <base-branch> (<base-sha>).` matching the supplied head, base, and target branch. A SHA mention, a bot comment, or a review of the same head against a different base does not match.

If exactly one comment matches, reuse its URL and skip only comment creation, continuing with the status label. If several match or the check is inconclusive, stop and report the ambiguity instead of reposting.

### 3. Translate and Format

Translate the completed verdict conservatively — never upgrade it:

- `BLOCK` → `changes-requested`
- `OK` → `ready-to-merge`
- `OK with notes` → `ready-to-merge` when the notes are non-blocking; `changes-requested` when a note reports missing or incomplete validation evidence
- exactly `No issues found.` → `ready-to-merge` when the supplied context and validation evidence are adequate; otherwise return for re-review
- missing or unrecognized verdict → stop and return for re-review

Map `P0` → Blockers (🚫), `P1` → Important Improvements (⚠️), `P2` → Suggestions (💡) mechanically; do not re-judge. Use this format; findings that already use it stay verbatim:

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

Reviewed at <head-sha> on <base-branch> (<base-sha>).
```

If a section has no items, write `None`.

### 4. Publish the Comment

Pipe the review to `gh`; literal stdin works without a file:

```bash
gh pr comment <PR_URL> --body-file -
```

### 5. Set the Status Label

GitHub labels are shared between issues and PRs, but these labels represent PR review state only. Keep only one active on the PR, from the translated verdict, not re-judged:

- `changes-requested` — translated from `BLOCK`, or `OK with notes` with unresolved validation gaps
- `ready-to-merge` — translated from `OK`, `No issues found.`, or `OK with notes` carrying only non-blocking notes

Ensure labels exist before applying them:

```bash
gh label create needs-review --repo <owner/repo> --description "PR status: ready and waiting for review" --color 5319E7 2>/dev/null || true
gh label create changes-requested --repo <owner/repo> --description "PR status: reviewed and requires changes before merge" --color D73A4A 2>/dev/null || true
gh label create ready-to-merge --repo <owner/repo> --description "PR status: reviewed and ready to merge" --color 0E8A16 2>/dev/null || true
```

Prefer `gh pr edit`:

```bash
gh pr edit <PR_URL> --remove-label needs-review --remove-label ready-to-merge --add-label changes-requested   # BLOCK / OK with unresolved validation gaps
gh pr edit <PR_URL> --remove-label needs-review --remove-label changes-requested --add-label ready-to-merge   # OK / No issues found / OK with non-blocking notes
```

If `gh pr edit` fails on a project-managed PR (known `projectCards` issue), change only the status labels through the issue-labels endpoints; unrelated labels stay untouched. A `404` from a DELETE only means that label was not present. Any other failure stops publication and is reported, not swallowed:

```bash
gh api repos/<owner>/<repo>/issues/<number>/labels/needs-review -X DELETE
gh api repos/<owner>/<repo>/issues/<number>/labels/ready-to-merge -X DELETE
gh api repos/<owner>/<repo>/issues/<number>/labels -X POST --input - <<< '{"labels":["changes-requested"]}'
```

For a `ready-to-merge` verdict, delete `needs-review` and `changes-requested` and post `ready-to-merge` instead.

### 6. Report Back

Tell the caller:

- the comment URL printed by `gh pr comment` (or the existing URL from step 2)
- the status label applied

## Guardrails

- Publish only what the review concluded. Never re-review, invent findings, or upgrade a verdict.
- No source edits and no merges.
- Verify head, base, and target branch before publishing; any mismatch returns for re-review.
- Check for an ambiguous prior publication before retrying a failed publish.
