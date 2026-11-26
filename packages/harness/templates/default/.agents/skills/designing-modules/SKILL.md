---
name: designing-modules
description: Assesses module responsibilities, public interfaces and caller burden. Use when inspection, refactoring or review needs a concrete boundary or test-seam decision; not for every code edit, a broad architecture audit or implementing the design.
---

# Designing Modules

Choose a responsibility and interface that hide more complexity than they expose. This is a design method, not an instruction to inspect the whole codebase, edit code or publish issues. Humans and agents may invoke it for the current design question; see [invocation rules](../../invocation.md).

## Start from the caller

Read the affected callers and implementation before proposing a boundary. Read `docs/context.md` for business terms, `docs/coding-standards.md` for stack constraints, and relevant ADRs for established ownership decisions. When the question crosses layers, framework or infrastructure dependencies, read [architecture boundaries](reference/architecture-boundaries.md).

- Name the caller's goal and the decisions it currently has to make: ordering, configuration, data shapes, failure modes and side effects, not just parameter count.
- Give one coherent responsibility a small public contract with useful results and explicit errors/dependencies. Hide volatile provider APIs, storage layout and protocol details when callers need not know them.
- Concentrate knowledge of one business rule or policy in one place. Similar syntax alone is not a reason to share an abstraction. Reject pass-through wrappers, speculative modes and layers that leave the same decisions with callers.
- Use names for domain behavior or technical capability. Replace unclear boolean modes with explicit operations/options when they represent different contracts.
- A test seam belongs at a real boundary. Do not expose private state or invent a production interface only to patch tests. Read [test quality](../implement-with-tdd/reference/tests.md) when selecting or evaluating coverage.

## Compare the current and proposed shapes

Use these questions on evidence from the scoped code:

- **Deletion:** would removing the module remove complexity, or force its decisions back into several callers?
- **Locality:** can the expected kind of behavior change in one place without coordinated changes across unrelated modules?
- **Caller burden:** can a caller use the contract without reading internals or knowing hidden sequencing, configuration or error conventions?
- **Test surface:** can important behavior be exercised through a stable public interface rather than private patches or excessive mocks?

Return the current burden, proposed owner/contract, alternatives and tradeoffs, affected callers and smallest safe next step. If the current design is adequate, say so. Leave implementation sequencing to `refactor-safely`, broad discovery/publication to `inspect-architecture`, and review publication to `code-review`; naming a follow-up does not authorize running it.
