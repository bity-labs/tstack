# Boilerplate Mobile Application

The mobile application for the TStack v2 boilerplate, using the shared boilerplate API. Mobile is an optional part of the exported starter.

**Status:** Minimal runnable Expo scaffold (single welcome screen).

## Stack

- Expo SDK 57 (latest stable at implementation time) with React 19.3.0 and React Native 0.87.1
- Expo Router 57 with a single welcome screen (no tabs, no auth flow)
- Effect v4 (`effect` 4.0.2) exercised minimally in a runtime-agnostic helper; no Node-only adapters
- Metro bundler via Expo's native configuration; TypeScript strict without Node-specific module settings

## Commands

Run from `apps/boilerplate-mobile-application`:

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the Expo dev server (Turbo routes `dev` to `expo start`) |
| `pnpm start` | Expo dev server directly (`android`/`ios`/`web` variants available) |
| `pnpm lint` | ESLint with the Expo flat config |
| `pnpm typecheck` | `tsc --noEmit` strict TypeScript check |
| `pnpm test` | Jest with `jest-expo` preset and React Native Testing Library |
| `pnpm build` | Production web bundle/export via `expo export --platform web` |

Native Android/iOS compilation and EAS builds are intentionally out of scope; `expo export` validates the production bundle target only. Device/E2E testing is deferred.
