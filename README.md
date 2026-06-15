# TStack

TStack is organized as a pnpm/Turborepo monorepo. This repository currently contains only the empty workspace shell; apps and packages are placeholders for future tickets.

## Layout

```txt
apps/
  boilerplate/       Placeholder for the future boilerplate app.
  documentation/    Placeholder for the future documentation app.
packages/
  cli/              Placeholder for the future CLI package.
  harness/          Placeholder for the future harness package.
    templates/default/  Placeholder for future default harness templates.
docs/
  adr/              Placeholder for architecture decision records.
```

## Workspace commands

Use pnpm from the repository root:

```sh
pnpm build
pnpm lint
pnpm test
pnpm typecheck
```

These commands are routed through Turbo and currently no-op cleanly until real apps and packages are added.
