# Agent Instructions

This repository uses TStack: a small harness for disciplined agentic software delivery.

## Navigation Protocol

1. Read this file first.
2. Read `docs/coding-standards.md` before changing code.
3. Read `docs/context.md` when the task touches product behavior, domain language, or business rules.
4. Use the skill matching the task; its method and conditional references live together under `.agents/skills/`. Follow `.agents/invocation.md` for human/agent invocation and composition. Consult `docs/engineering/index.md` only to select a relevant risk guide.
5. Check `docs/adr/` before changing architecture, boundaries, data ownership, or long-term constraints.

## Source of Truth

- GitHub Issues hold specs, tasks, and acceptance criteria.
- `docs/context.md` holds durable product and domain language.
- `docs/coding-standards.md` holds project-level implementation expectations.
- `docs/engineering/` holds conditional risk guides and navigation to method owners.
- `docs/adr/` holds important architectural decisions and rationale.
- `.agents/skills/` owns reusable methods, workflows and their local references; an invocation does not grant additional permissions.

## Working Rules

- Understand the requested outcome before editing.
- Ask when intent, domain meaning, or risk is unclear.
- Keep changes small and focused.
- Do not mix unrelated refactoring into feature or bug-fix work.
- Do not add dependencies or major abstractions without asking.
- Prefer behavior verified through public interfaces.
- Validate before finishing, or explain why validation could not be run.
- Run the project’s configured validation commands directly unless the project documents a local wrapper.
- Report what changed, what was validated, and what risk remains.
