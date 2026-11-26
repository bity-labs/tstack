# Invocation and composition

Use a skill when the authorized task calls for its workflow. Use the host's skill loader by name when available; otherwise read `.agents/skills/<name>/SKILL.md` in this project. These are harness conventions, not portable host-enforced flags.

## Read references directly

Each method has one maintained definition, but its references are not private. Any skill can link directly to the relevant reference or section of another skill. Resolve Markdown links relative to the containing file, and project paths such as `docs/context.md` from the installed project root. Reuse already loaded guidance rather than loading a workflow just to read its rules.

For example, planning and review can read the [test-quality reference](skills/implement-with-tdd/reference/tests.md) without starting red-green-refactor. The file stays maintained with `implement-with-tdd`; consumers do not copy its rules or invoke TDD just to assess coverage.

## Keep the task's scope and approvals

Preparing a plan, checking a reproduction or reading review criteria stays within that task; it does not start implementation or another workflow's publication steps. Invoke another skill when its actual work is needed, not to neutralize its workflow with a special mode.

Reading a reference or invoking a skill grants no extra permission. Keep host/user approval rules and the workflow's existing gates for GitHub publication, labels, commits, pushes and delivery. Planning may proceed within the authorized request; approval before publication remains a separate step.
