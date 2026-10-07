# Boilerplate API

The shared backend for the TStack v2 boilerplate's web and mobile applications. Clients consume its API rather than importing server or database implementation.

**Status:** Minimal scaffold. Node.js 24 HTTP API built with Effect v4 (`effect` 4.0.2, `@effect/platform-node` 4.0.2). Exposes an OpenAPI-described `GET /health` returning `HTTP 200 {"status":"ok"}` and the generated OpenAPI contract at `/openapi.json`. No database, authentication, or client integration. In Effect v4 the platform HTTP API lives in the core `effect` package (`effect/http`, `effect/http-api`); the Node adapter and runtime are in `@effect/platform-node`.

## Commands

```sh
pnpm dev        # develop with tsx watch (src/main.ts)
pnpm typecheck  # tsc --noEmit over src and tests
pnpm test       # vitest (Effect-aware tests via @effect/vitest)
pnpm build      # tsc build emitting application JavaScript to dist/ (tests excluded)
pnpm start      # node dist/main.js with production dependencies
```

Set `PORT` (default `3000`) to control the listening port.
