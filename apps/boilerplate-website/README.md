# Boilerplate Website

The commercial and marketing website for products built with the TStack v2 boilerplate, separate from the product application.

**Status:** Minimal runnable scaffold: one static welcome page built with Astro and plain CSS. No React integration or UI library.

## Commands

Run from the repository root:

```sh
pnpm install
pnpm dev --filter=@tstack/boilerplate-website     # dev server for the website
pnpm build --filter=@tstack/boilerplate-website  # production build into dist/
pnpm preview --filter=@tstack/boilerplate-website # serve the production build
pnpm typecheck --filter=@tstack/boilerplate-website
pnpm test --filter=@tstack/boilerplate-website     # builds dist/ then runs Vitest
```

`pnpm test --filter=@tstack/boilerplate-website` builds the production output with Astro and then runs Vitest (with coverage, no percentage gate): container-rendered welcome-page tests plus assertions on the built `dist/index.html`.

Production output is emitted to `dist/` by Astro's Vite tooling; the test script builds it and asserts the served welcome behavior.
