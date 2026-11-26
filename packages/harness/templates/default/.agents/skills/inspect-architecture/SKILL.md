---
name: inspect-architecture
description: Inspect a codebase or area for architectural friction and create architecture opportunity issues. Use when the user wants to find refactoring opportunities, improve architecture, reduce coupling, deepen modules, or make code easier to test and maintain.
---

# Inspect Architecture

Inspect architecture before changing it. Find broad architecture opportunities, explain the evidence and tradeoffs, and create GitHub issues that can later be broken into agent-grabbable tasks.

## Use and Context

Keep inspection read-only until the publication step; do not implement opportunities. See [invocation rules](../../invocation.md).

Read `docs/context.md` for the inspected business area and relevant ADRs before judging its boundaries. Read `docs/coding-standards.md` when recommendations depend on stack constraints. Invoke `designing-modules` to assess responsibilities and interfaces. Load the matching guide in `docs/engineering/` when findings involve domain ambiguity, persisted data, security or legacy risk; do not preload every method or risk guide.

## Workflow

### 1. Choose Scope

Clarify the inspection scope before exploring.

Examples:

- whole codebase
- one feature area
- one module or package
- code touched by a PR
- code that is hard to test or change

If the scope is too broad, narrow it to the area with the most immediate product or maintenance pressure.

### 2. Understand the Domain and Decisions

Read the domain language and relevant ADRs before judging the code.

Look for:

- named domain concepts
- invariants and business rules
- external systems and integration boundaries
- architectural decisions that should not be re-litigated casually
- terms that are fuzzy, overloaded, or missing from `docs/context.md`

Do not invent new architecture language if the project already has names for the concepts.

### 3. Explore the Code

Inspect the scoped area and nearby callers/callees.

Collect concrete examples of change friction, caller coordination and test pain for the design assessment. Check whether domain concepts match `docs/context.md` and whether code contradicts an ADR without documenting why. Do not infer a design problem solely from file count or naming taste.

Use git history when useful:

```bash
git log --oneline -- <path>
git blame <path>
```

Repeated churn in the same files is evidence, not proof. Use it to guide inspection, not as the final argument.

### 4. Apply Architecture Tests

Apply `designing-modules` to the collected examples, using its deletion, locality, caller-burden and test-surface questions. Read [test quality](../implement-with-tdd/reference/tests.md) if a testability finding needs coverage analysis. Report possible refactoring as an opportunity rather than implementing it.

### 5. Produce Findings

Every finding must be evidence-based.

For each finding, include:

- **Symptom** — what friction is visible
- **Evidence** — files, examples, test pain, churn, or docs mismatch
- **Risk** — why it matters to future changes
- **Likely cause** — the architectural shape creating the friction
- **Suggested direction** — how the design could improve
- **Safe first step** — the smallest useful next move

Do not propose vague rewrites. Do not recommend a large refactor unless you can explain why smaller steps are insufficient.

### 6. Identify Architecture Opportunities

Group findings into broad architecture opportunities.

An architecture opportunity describes one coherent architectural problem or improvement direction. It captures the context, evidence, risk, and desired direction for work that may later be decomposed into concrete implementation tasks.

Examples:

- centralize payment status handling behind one payment state module
- deepen an external API integration boundary
- reduce caller burden around a feature's domain model
- create a better test seam for a legacy workflow

Each opportunity should be narrow enough to explain clearly, but broad enough to hold the context for multiple implementation tasks if needed.

Use categories:

- **Now** — high leverage, low or moderate risk, clear next decomposition path
- **Next** — valuable, but needs more context, tests, or sequencing
- **Later** — real issue, but not worth disturbing yet
- **Do not change yet** — looks messy but is constrained by ADRs, product uncertainty, or insufficient evidence

### 7. Produce the Report

Do not change code in this skill.

Output:

```md
# Architecture Inspection Report

## Scope

<what was inspected and why>

## Summary

<short diagnosis of the architecture pressure>

## Findings

### 1. <finding name>

- Symptom:
- Evidence:
- Risk:
- Likely cause:
- Suggested direction:
- Safe first step:
- Priority: Now / Next / Later / Do not change yet

## Architecture Opportunities

### 1. <opportunity title>

- Problem:
- Evidence:
- Risk:
- Desired direction:
- Blocking questions, if any:
- Priority: Now / Next / Later

## What Not To Change Yet

<areas that should be left alone and why>

## Documentation Notes

<domain terms, ADR questions, or docs mismatches discovered>
```

### 8. Create Architecture Opportunity Issues

Create GitHub issues for selected architecture opportunities.

Resolve the target repository before mutating GitHub:

```text
<owner/repo>
```

Ask the user which opportunities to publish:

```text
Which architecture opportunities should I create issues for?

1. Recommended opportunity only
   Create one issue for the highest-leverage opportunity.

2. All "Now" opportunities
   Create issues for every opportunity ranked Now.

3. Selected opportunities
   You choose which opportunities become issues.

4. None
   Keep the report only.

Recommended: Recommended opportunity only.
```

If running unattended, create issues only when the original task explicitly asked for it. Otherwise stop after the report.

Every created issue gets the `architecture-opportunity` label.

Create the label first if it does not exist in the target repository:

```bash
gh label create architecture-opportunity --repo <owner/repo> --description "Parent architecture improvement opportunity" --color 1D76DB 2>/dev/null || true
```

Do not use `ready-for-agent` on architecture opportunity issues. `ready-for-agent` is for agent-grabbable task issues created from a parent issue.

Issue body template:

```md
## Architecture Opportunity

<one coherent architecture topic>

## Problem

<what friction exists>

## Evidence

<files, examples, churn, test pain, or docs mismatch>

## Risk

<why this matters>

## Desired Direction

<the intended architectural direction>

## Blocking Questions

<only include when the opportunity cannot be decomposed into tasks yet>

## Decomposition Notes

<initial thoughts for future implementation tasks, if useful>

## Out of Scope

<what should not be included in this opportunity>
```

Create issues with GitHub CLI:

```bash
gh issue create \
  --repo <owner/repo> \
  --title "<architecture opportunity title>" \
  --label architecture-opportunity \
  --body-file <issue-body-file>
```

### 9. Handle Blocking Questions

If an opportunity issue has blocking questions:

1. Create the issue with the `architecture-opportunity` label.
2. Show the blocking questions to the user after creating the issue.
3. Ask whether they want to answer now or leave the issue for later.
4. If they answer now, update the issue with the clarified answers and remove resolved blocking questions.
5. If blocking questions remain, leave them in the issue.

Prompt:

```text
This architecture opportunity has blocking questions before it can be broken into ready-for-agent tasks.

Do you want to answer them now so I can update the issue, or leave them for later?
```

Report at the end:

- created issue URLs
- opportunities with blocking questions
- opportunities ready to be decomposed into agent-grabbable tasks

## Guardrails

- Do not change code.
- Do not create broad refactor plans without evidence.
- Do not create `ready-for-agent` task issues in this skill; this skill creates architecture opportunity issues only.
- Do not re-litigate ADRs unless current friction is strong enough to justify revisiting them.
- Do not suggest interfaces before understanding the caller burden and domain language.
- Do not optimize for aesthetic cleanliness; optimize for locality, leverage, testability, and safer future changes.
- If the best answer is "do nothing for now," say so.
