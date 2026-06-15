# Agent Instructions

This repository uses TStack: a small harness for disciplined agentic software delivery.

## Navigation Protocol

1. Read this file first.
2. Read `docs/coding-standards.md` before changing code.
3. Read `docs/context.md` when the task touches product behavior, domain language, or business rules.
4. Read `docs/engineering/index.md` and load only the engineering rule files relevant to the task.
5. Check `docs/adr/` before changing architecture, boundaries, data ownership, or long-term constraints.

## Source of Truth

- GitHub Issues hold specs, tasks, and acceptance criteria.
- `docs/context.md` holds durable product and domain language.
- `docs/coding-standards.md` holds project-level implementation expectations.
- `docs/engineering/` holds reusable engineering doctrine.
- `docs/adr/` holds important architectural decisions and rationale.
- `.agents/skills/` holds reusable workflows that use the docs.

## Working Rules

- Understand the requested outcome before editing.
- Ask when intent, domain meaning, or risk is unclear.
- Keep changes small and focused.
- Do not mix unrelated refactoring into feature or bug-fix work.
- Do not add dependencies or major abstractions without asking.
- Prefer behavior verified through public interfaces.
- Validate before finishing, or explain why validation could not be run.
- Use `scripts/run_silent` for noisy validation commands when available, so successful checks stay compact and failures show full output.
- Report what changed, what was validated, and what risk remains.
