---
title: Project Context
---

## Purpose

This file captures durable product and domain context for the project that installs this harness.

Agents should read this file before changing domain behavior, naming business concepts, or making product assumptions.

## Template State

Sections containing example or placeholder content are non-authoritative.
Before using placeholder terms, rules, providers, or decisions as project context,
agents must ask the maintainer to replace them with real project information.

## Product Summary

Describe what the project does, who it serves, and the outcome it exists to create.

## Domain Language

Record the shared vocabulary of the project.

| Term | Meaning | Notes |
|---|---|---|
| Example | Replace with a real project term. | Link ADRs or feature docs when useful. |

## Important Distinctions

Capture terms that are easy to confuse.

- Example: `Account` vs `User` — define the difference before using either in code.

## Business Rules

List durable rules that should remain true across implementations.

- Example: A user can only manage resources they own.

## External Systems

List important providers, protocols, APIs, or services the project depends on.

| System | Role | Boundary Notes |
|---|---|---|
| Example Provider | Replace with real dependency. | Note ownership, retries, auth, or data exposure concerns. |

## Decisions and References

Link ADRs, feature docs, or issues that define important context.

- ADRs: `docs/adr/`
- Engineering rules: `docs/engineering/`

## Maintenance Rules

- Update this file when durable project language changes.
- Do not store temporary plans here; use GitHub Issues for specs and tasks.
- Do not duplicate coding doctrine here; use `docs/coding-standards.md` and `docs/engineering/`.
