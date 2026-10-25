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
```

`templates/default` contains the imported generic harness payload. Future variants can be added as sibling directories under `templates/` without changing the package boundary.

## Scope

This package only stores harness templates. It does not provide a CLI installer, scaffold command, boilerplate app, documentation app, deployment automation, or framework-specific variants.
