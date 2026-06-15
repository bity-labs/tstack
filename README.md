# TStack

TStack is organized as a pnpm/Turborepo monorepo. The generic engineering harness lives in `packages/harness`; the remaining apps and packages are placeholders for future tickets.

## Layout

```txt
apps/
  boilerplate/       Placeholder for the future boilerplate app.
  documentation/    Placeholder for the future documentation app.
packages/
  cli/              Placeholder for the future CLI package.
  harness/          Generic engineering harness package.
    templates/default/  Installable default harness payload.
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

These commands are routed through Turbo and currently no-op cleanly for packages that do not define matching scripts.
