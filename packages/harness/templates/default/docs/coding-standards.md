---
title: Coding Standards
---

## Principle

Make small, intentional, validated changes that preserve project language, project conventions, and long-term maintainability.

## Default Workflow

1. Read `AGENTS.md`.
2. Read `docs/context.md` when the task touches product or domain behavior.
3. Load only the relevant engineering rules from `docs/engineering/index.md`.
4. Understand the requested outcome before editing.
5. Make the smallest focused change that solves the task.
6. Validate the change with relevant tests, checks, or a clear explanation of what could not be run.
7. Report what changed, how it was validated, and any remaining risk.

## Rules

- Follow the existing style, naming, structure, and patterns of the project unless the task asks to change them.
- Do not add dependencies, services, frameworks, or major abstractions without asking first.
- Keep feature work, bug fixes, refactoring, and formatting-only changes separate.
- Prefer public-interface behavior tests over implementation-detail tests.
- Add regression coverage for bugs when practical.
- Keep user-facing text, domain terms, and API names consistent with `docs/context.md`.
- Update ADRs when a decision changes architecture, boundaries, data ownership, or long-term constraints.
- Do not hide uncertainty. Ask when intent, domain meaning, or risk is unclear.
- Leave temporary debug code, commented-out experiments, and unused files out of the final change.

## Validation

Project-specific commands belong below after the harness is installed in a real project.

```text
# Example placeholders:
# npm test
# npm run lint
# npm run typecheck
```

Run the project’s configured validation commands directly unless the project documents a local wrapper.

If validation cannot be run, explain why and state the manual checks performed.

## Dependency Policy

- Use existing project dependencies by default.
- Ask before adding a runtime dependency.
- Prefer standard library or small local code for simple needs.
- If a dependency is added, explain why it is worth the maintenance and supply-chain cost.
