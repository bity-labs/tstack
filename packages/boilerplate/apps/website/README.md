# Website

`@tstack/website` is your SaaS product's commercial website. It is a minimal
static Astro site with neutral English copy, no invented product claims, no
backend, and no required environment variables. It is separate from TStack's
own website in the outer repository.

## Development

Use Node.js 24 or later and the boilerplate's pinned pnpm version. Install
dependencies with `pnpm install` from the boilerplate root
(`packages/boilerplate` inside TStack), then run:

```sh
pnpm --filter @tstack/website dev
```

Development and preview use port 4323 so this site can run alongside TStack's
own site on 4321. The boilerplate's `pnpm dev` starts it automatically. Target
this application directly for checks:

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
- Replace the `Your SaaS` name, page title, description, favicon, and welcome
  copy with your own product branding before publishing.
- Place static assets in `public/`.
- The production build writes static files to `dist/`; serve that directory
  with any static host. No server adapter is required.
- Keep source, comments, documentation, and visible text in English.
