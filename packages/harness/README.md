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
      agents/
      prompts/
```

`templates/default` contains the imported generic harness payload. Future variants can be added as sibling directories under `templates/` without changing the package boundary.

## Pi assets

Keep Pi-specific agent definitions in `.pi/agents/` and slash-command prompts in `.pi/prompts/`. Shared skills remain in `.agents/skills/`; these are separate discovery locations, not interchangeable directories.

The default template includes the tiered agent roster and `/autoshift` prompt. Install [pi-subagents](https://pi.dev/packages/pi-subagents) with `pi install npm:pi-subagents`, trust the target project, and run `/reload` to refresh discovery. Verify model availability with `/subagents-models`; see [the roster README](templates/default/.pi/agents/README.md) for roles and execution rules.

The monorepo dogfoods these assets through root `.pi/agents` and `.pi/prompts` symlinks. Root `.pi` itself stays real so local settings and runtime state are not shared. Template payloads contain only reusable assets, never project-local Pi settings or session state.

The CLI's default-template overlay copies these assets into generated projects as real files alongside the shared skills and docs. Standalone harness installs must likewise copy them rather than retain monorepo symlinks.

## Scope

This package only stores harness templates. It does not provide a CLI installer, scaffold command, boilerplate app, documentation app, deployment automation, or framework-specific variants.
