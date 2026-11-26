---
title: Engineering Navigation
---

Methods live with their owning skills. This index is optional navigation, not a reading prerequisite. Follow [invocation and composition](../../.agents/invocation.md); loading a method never authorizes another workflow's external effects.

## Method owners

- [implement-with-tdd](../../.agents/skills/implement-with-tdd/SKILL.md): implement behavior through red-green-refactor. For test design, characterization or coverage review, read [test quality](../../.agents/skills/implement-with-tdd/reference/tests.md) directly; for dependency doubles, read [mocking](../../.agents/skills/implement-with-tdd/reference/mocking.md).
- [designing-modules](../../.agents/skills/designing-modules/SKILL.md): responsibility, public interface, caller burden and dependency-boundary decisions; not a mandatory step for every edit.
- [debug](../../.agents/skills/debug/SKILL.md): reproduce, minimize, test hypotheses, fix a confirmed cause and verify.
- [refactor-safely](../../.agents/skills/refactor-safely/SKILL.md): preserve behavior in small green-to-green steps.
- [code-review](../../.agents/skills/code-review/SKILL.md): review and publish feedback for a PR. Read its [criteria](../../.agents/skills/code-review/SKILL.md#review-criteria) and [severity guidance](../../.agents/skills/code-review/SKILL.md#5-write-findings) directly when assessing feedback, without starting publication.

## Risk guides

Read each matching guide when its risk is present. Risks can accumulate; there is no file quota or requirement to read all guides.

- [Domain](domain-modeling.md): ambiguous business terms, invariants, states or ownership language.
- [Data](data-modeling.md): access patterns, atomicity, schemas, migrations, compatibility, retention or persistence ownership.
- [Legacy](legacy-code.md): risky/untested behavior or a missing safety net, regardless of code age.
- [Security](security-review.md): trust boundaries, authorization, untrusted input, secrets, redirects or data exposure.

Project facts stay in `docs/context.md`, concrete stack/tooling conventions in `docs/coding-standards.md`, and durable decisions in `docs/adr/`. These references are not replaced by a generic skill.
