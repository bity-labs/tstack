---
name: implement-with-tdd
description: Implements clear behavior through red-green-refactor. Use for test-first behavior changes and regression fixes; not for planning, reviewing tests or behavior-preserving refactoring alone.
---

# Implement With TDD

Implement clear behavior one verified slice at a time.

## Use and Composition

Use this workflow to implement requested behavior. For test design, characterization or review without a behavior change, read [test quality](reference/tests.md) directly instead. See [invocation rules](../../invocation.md).

- Read `docs/coding-standards.md` before changing code for its stack constraints and validation commands. Read `docs/context.md` for product behavior or terminology, and relevant ADRs when a decision or boundary is affected.
- When designing, changing, or assessing tests, read [test quality](reference/tests.md). When controlling external dependencies, time, randomness, or other nondeterminism, also read [mocking](reference/mocking.md).
- If a public interface or test seam needs a design decision, invoke `designing-modules`. Do not introduce a wrapper or injectable layer solely to satisfy a test.

## Workflow

### 1. Plan

Before writing code:

- Understand the target behavior from the user's request.
- Propose the interface changes needed (entrypoint, parameters, return type).
- List the behaviors to test, in the order you will tackle them.
- Flag any deep-module, boundary, or mocking concerns.

If the user is present (HITL), present the plan and wait for explicit approval before proceeding.
If running unattended (AFK), proceed with the plan directly.

### 2. Tracer Bullet

One RED → GREEN cycle to prove the path:

1. Write one test for the smallest useful behavior through a public entrypoint, spanning the necessary layers rather than testing isolated layers in advance.
2. Confirm it fails for the expected reason.
3. Write the minimal code to pass.
4. Confirm green.

### 3. Incremental Loop

For each remaining behavior, repeat:

1. **Red**: write one failing test.
2. **Green**: write the minimal code to pass.
3. Confirm green before moving on.

Rules:

- One test at a time.
- Only enough code for the current test.
- Do not anticipate future tests.
- Follow `docs/coding-standards.md` for test naming, structure, and tooling.
- If a slice is hard to reason about, reduce its behavior/input scope instead of writing a large suite ahead of the implementation.

### 4. Refactor

When the current set of tests passes:

1. Propose one refactor at a time (naming, duplication, boundaries).
2. Confirm green after each change.
3. Stop when the code is clear enough for the current purpose.

Never refactor while RED.

For a separately scoped structural change, invoke `refactor-safely` instead of inventing a new behavior to make a test fail. This does not expand the approved implementation scope.

## Checklist Per Cycle

- [ ] Test describes behavior, not implementation
- [ ] Test uses public interface only
- [ ] Test would survive an internal refactor
- [ ] Implementation is minimal for this test
- [ ] No speculative features added
- [ ] Refactor only from GREEN
