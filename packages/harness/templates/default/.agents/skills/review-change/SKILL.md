---
name: review-change
description: Inspect a change against the project's engineering doctrine and return findings and a verdict to the parent without publishing comments or changing labels.
---

# Review Change (inspection-only)

Inspect a change against the project's engineering doctrine and return findings
and a verdict to the parent. The parent owns publication, labels, fixes, and
follow-up dispatch.

The change under review may be an uncommitted working diff, a committed range
against a base, or a pull request. Whatever its form, confirm and pin the exact
revision before inspecting: repository, head commit/SHA, target base branch,
and, for a pull request, its number and URL. Review only that revision. A
changed head, base, or target invalidates the review until it is re-inspected.

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

### 1. Load doctrine before the diff

Read the review doctrine before judging the change. Do not review from generic
taste; review against the project's stated rules, vocabulary, and decisions.

### 2. Understand intent

Read the change's stated intent: title, description, linked issue, PRD, or
task, and the stated acceptance criteria. Flag unrelated work mixed into the
change.

### 3. Inspect the change

Inspect the diff and surrounding code. Focus on observable behavior, edge
cases, failure paths, test quality, interface shape, domain language
consistency, ADR alignment, security and operational risk, and unnecessary
complexity. For large changes, prioritize the highest-risk files and state what
was not inspected deeply.

If a required inspection cannot run (missing checks, unavailable tests,
insufficient access), report it as missing evidence. Missing evidence is not a
passing check.

### 4. Classify findings

Each finding states where it appears, why it matters, and the smallest fix.
Classify each as:

- `blocker` — correctness, security, or spec violation that must be fixed
  before merge
- `required` — must be addressed before release or acceptance, but does not
  block merge on its own
- `suggestion` — non-blocking improvement

Do not block on personal preference. Distinguish required fixes from optional
improvements. If doctrine is missing, say what is missing and proceed with
clearly labeled generic review criteria.

### 5. Return findings and verdict, do not publish

Return the findings and a verdict to the parent:

- `APPROVE` — no unresolved blockers or required findings and adequate
  validation evidence
- `CHANGES` — at least one blocker or required finding
- `BLOCKED` — the review could not finish; name exactly what is missing

Do not post comments, edit labels, change GitHub state, or fix code. The parent
publishes the review, applies labels, and routes fixes to a writer, then
requests review of the updated diff.

## Guardrails

- Always read doctrine before reviewing the diff.
- Never edit code, stage files, or mutate the repository.
- Do not invent project rules that are not in the docs.
- For large changes, state any areas not reviewed deeply.
