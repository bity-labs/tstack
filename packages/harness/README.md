# @tstack/harness

Generic TStack engineering harness package for agentic software delivery.

The harness is independent from any boilerplate application. It is intended to be copied or installed into an existing codebase so agents have consistent project instructions, coding standards, durable context, engineering doctrine, ADR guidance, and reusable skills.

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
      skills/
    .pi/
      settings.example.json
```

`templates/default` contains the imported generic harness payload. Future variants can be added as sibling directories under `templates/` without changing the package boundary.

## Scope

This package only stores harness templates. It does not provide a CLI installer, scaffold command, boilerplate app, documentation app, deployment automation, or framework-specific variants.

## Pi subagent overrides

`templates/default/.pi/settings.example.json` maps builtin subagent roles to harness skills: `worker` → `implement-with-tdd`, `reviewer` → `code-review`, `delegate` → `publish-review`, `scout` → `understand-codebase`. Builtin prompts, tools, and models stay untouched; the `delegate` override only drops direct file-edit tools so it publishes with `gh` without editing source.

To adopt it, merge the `subagents` block into your project's `.pi/settings.json` by hand, preserving existing keys. Pi never reads `settings.example.json` directly, and this package does not install or change live settings.

`code-review` alone is inspection-only: it returns findings and a verdict without publishing. A full review-and-publish cycle is parent-coordinated — the builtin reviewer inspects, then the `publish-review` delegate posts the comment and sets the label (see `docs/engineering/code-review.md`).
