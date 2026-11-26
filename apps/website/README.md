# Website

`@tstack/website` is the public tstack welcome page. It is a static Astro site
with no application features, backend, or required environment variables.

This site belongs to TStack itself. It is not part of the independently runnable
SaaS project in `packages/boilerplate`.

## Development

Use Node.js 24 or later and the pnpm version declared at the repository root.
Install dependencies with `pnpm install` from the repository root, then run:

```sh
pnpm --filter @tstack/website dev
```

The development server uses port 4321. Run workspace tasks through the root
Turbo scripts, or target this application directly:

```sh
pnpm --filter @tstack/website lint
pnpm --filter @tstack/website typecheck
pnpm --filter @tstack/website build
pnpm --filter @tstack/website preview
```

Dev and preview use `--ignore-lock` to keep Astro in the foreground even in an
agent environment. Turbo or the orb service supervisor owns the process;
Astro must not detach into its own background daemon.

Linting uses the shared ESLint configuration and Astro's recommended rules.
Type checking uses Astro Check and the shared strict TypeScript configuration.
There is no placeholder test command for this static page.

## Editing and deployment

- Edit the page and its styles in `src/pages/index.astro`.
- Place static assets in `public/`.
- The production build writes static files to `dist/`; serve that directory
  with any static host. No server adapter is required.
- Keep source, comments, documentation, and visible text in English.
