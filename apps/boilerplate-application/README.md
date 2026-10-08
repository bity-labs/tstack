# Boilerplate Application

The product web application for the TStack v2 boilerplate, separate from its commercial website, product documentation, and shared API.

**Status:** Minimal runnable Next.js scaffold (welcome page).

Stack: Next.js 16 App Router (App Router source under `src/app/`), React 19, Tailwind CSS 4 with an initialized shadcn/ui setup (`components.json`, `src/lib/utils.ts`, `src/components/ui`), and Effect v4.

- `pnpm dev` — run the development server (`next dev`)
- `pnpm build` — production build through Next-native tooling
- `pnpm typecheck` — `tsc --noEmit` with strict, framework-compatible settings
- `pnpm lint` — ESLint with Next.js and type-aware TypeScript rules (`--max-warnings=0`)
- `pnpm test` — Vitest (`vitest run --coverage`) in a `happy-dom` environment, covering the Effect-aware welcome program (`@effect/vitest`) and the rendered welcome page and shadcn/ui button (React Testing Library)

The welcome page resolves its content through a small Effect v4 program (`src/lib/welcome.ts`); no API integration, authentication, database, dashboard template, or extra component catalog is included. Pinned versions live in `package.json` and the shared root lockfile.
