---
title: Architecture
---

## Purpose

This file captures the durable architecture of the project that installs this harness: the system shape, its parts, and the boundaries between them.

Agents should read this file before changing structure, adding packages or services, or making assumptions about how the system fits together.

## Template State

Sections containing example or placeholder content are non-authoritative.
Before using placeholder parts, boundaries, flows, or decisions as project architecture,
agents must ask the maintainer to replace them with real project information.

## System Overview

Describe the system at a high level: what it is made of, how the parts relate, and what runs where.

## System Parts

| Part | Role | Location | Notes |
|---|---|---|---|
| Example | Replace with a real part. | Replace with its location in the codebase. | Link deeper docs or ADRs when useful. |

## Dependencies and Direction

Record which parts may depend on which. Prefer arrows pointing from volatile to stable.

- Example: `Example` may depend on `Core`; `Core` must not depend on `Example`.

## Key Flows

Walk through the flows that matter most when changing the system.

1. Example flow: entry point → processing steps → result.

## External Interfaces and Systems

| System | Role | Boundary Notes |
|---|---|---|
| Example Provider | Replace with a real dependency. | Note ownership, retries, auth, or data exposure concerns. |

## Environments and Deployment

List the environments (local, staging, production), how the system is deployed, and where runtime configuration lives.

## Related Decision Records

Link ADRs and rule files that constrain this architecture.

- ADRs: `docs/adr/`
- Architecture boundaries rules: `docs/engineering/architecture-boundaries.md`
- Deep modules rules: `docs/engineering/deep-modules.md`

## Maintenance Rules

- Update this file whenever system parts, boundaries, or flows change in a lasting way.
- Record the why of important structural choices in `docs/adr/`, not here.
- Do not store temporary or in-flight designs here; use GitHub Issues for specs and plans.
- Do not duplicate engineering doctrine here; use `docs/engineering/`.
