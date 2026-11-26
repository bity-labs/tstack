---
title: Legacy Code
---

## Principle

Treat risky or untested code as code that must first be understood and protected before it is changed.

## Rules

- Define legacy risk by missing safety, not age. New code without tests can be legacy code.
- Understand the current behavior before judging whether it is correct.
- Add characterization tests around existing behavior before changing risky areas.
- Create seams at boundaries where dependencies make testing or change difficult.
- Prefer small dependency-breaking changes over broad rewrites.
- Change one behavior at a time and verify after each step.
- Preserve existing behavior unless the task explicitly requires changing it.
- Document surprising behavior when it is intentionally preserved.

## Safe Change Strategy

Identify the current contract and the intended difference before selecting a method. Invoke `refactor-safely` for structural changes and `implement-with-tdd` for requested behavior changes. For characterization, read [test quality](../../.agents/skills/implement-with-tdd/reference/tests.md) directly and establish a passing baseline. If missing seams make protection difficult, invoke `designing-modules` for that boundary question. Reading this risk guide does not authorize a rewrite.

## Checklist

- What behavior must stay the same?
- What behavior must change?
- Is there characterization coverage for the risky path?
- Is the seam explicit enough for future tests?
- Was a rewrite avoided unless clearly justified?
