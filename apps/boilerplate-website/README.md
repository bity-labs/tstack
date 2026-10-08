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
pnpm test --filter=@tstack/boilerplate-website     # runs Vitest after the build task
```

`pnpm test --filter=@tstack/boilerplate-website` runs Vitest (with coverage, no percentage gate): container-rendered welcome-page tests plus assertions on the built `dist/index.html`. Turbo orders the website's `test` task after its `build` task (package-local `turbo.json`, `test` dependsOn `build`), so the production build output is fresh when the tests run. Never embed `astro build` in the `test` script: Turbo runs `build` and `test` concurrently and both write `dist/`.

Production output is emitted to `dist/` by Astro's Vite tooling; the build task produces it and the tests assert the served welcome behavior.
