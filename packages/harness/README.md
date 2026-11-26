# @tstack/harness

Generic TStack engineering harness package for agentic software delivery.

The harness is independent from any boilerplate application. Copy its complete payload into a project to provide agent guidance, project context, ADRs, conditional risk guides and reusable skills. Review collisions with project-owned files before copying; this package is not an installer.

## Template structure

Installable payloads live under `templates/*`:

```txt
templates/
  default/
    AGENTS.md
    docs/
      context.md
      coding-standards.md
      adr/
      engineering/
    .agents/
      invocation.md
      skills/
        implement-with-tdd/
          SKILL.md
          reference/
        designing-modules/
          SKILL.md
          reference/
        ...
```

`templates/default` contains the generic harness, evolved from the V1 import. Its 14 skills retain the original 13 names and add `designing-modules`. Skills with local `reference/` resources must keep their whole directory. The skills compose with each other and project documentation: copying a single `SKILL.md` is not a standalone installation.

## Method ownership

Each method has one maintained definition. Its references are shared reading material: consumers link directly to the relevant file or section without copying its rules or starting the owner's workflow.

- `implement-with-tdd` is the red-green-refactor workflow. It also maintains the [test-quality](templates/default/.agents/skills/implement-with-tdd/reference/tests.md) and [mocking](templates/default/.agents/skills/implement-with-tdd/reference/mocking.md) references, which planning, review and refactoring can read directly without invoking TDD.
- `designing-modules` owns shared responsibility/interface assessment and conditionally loads `reference/architecture-boundaries.md`.
- `debug`, `refactor-safely` and `code-review` own investigation, behavior-preserving changes and review criteria respectively. They compose the design/test methods rather than redefining them.
- `docs/engineering/index.md` routes to those owners and the retained domain, data, legacy and security risk guides. No unconditional doctrine reading list or file quota is required.
- Project facts, concrete stack constraints and architectural decisions remain in `docs/context.md`, `docs/coding-standards.md` and `docs/adr/`.

The former standalone testing/TDD/mocking, deep-module/interface/boundary, debug, refactor and review doctrine pages have been merged into these owners and removed. Existing installed V1 copies are independent snapshots, not automatically migrated. Preserve their project-owned content and review consumers when adopting this layout.

## Invocation and distribution

Read the payload's [.agents/invocation.md](templates/default/.agents/invocation.md) for composition rules. Read references for guidance; invoke skills when their workflow is the work needed. Preparing a plan or checking evidence does not start implementation or publication. Existing workflow approval and delivery gates still apply; reading a reference or loading a skill grants no extra permission.

The package's `files` manifest distributes the complete `templates/` tree, including `.agents/` and local references. `pnpm --filter @tstack/harness pack --pack-destination <directory>` creates an archive for inspection, not publication. Copy the contents of `templates/default/` (including hidden directories) as a unit into an independent project root; skills resolve project paths from that root and Markdown links from the document containing them. There are no runtime dependencies, symlinks, build steps or parent-workspace imports.

## Scope

This package only stores harness templates. It does not provide a CLI installer, scaffold command, boilerplate app, documentation app, deployment automation, or framework-specific variants.
