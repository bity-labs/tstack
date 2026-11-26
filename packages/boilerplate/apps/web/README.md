# Web application

TanStack Start with React, Vite, Tailwind CSS, local shadcn/ui components, TanStack Query, Vitest and Storybook. All business API calls use `@tstack/sdk` or `@tstack/sdk/react`.

## Source layout

`src/features/authentication`, `account` and `system` own their UI and colocated tests, exported through client-safe `index.ts` modules. `src/routes` contains thin TanStack file routes: the pathless `_authenticated.tsx` layout verifies the user in `beforeLoad`; `_authenticated.account.tsx` still serves `/account`. Shared primitives stay in `src/components/ui`.

`src/lib/session.functions.ts` contains the request-aware Start server function; `api-proxy.server.ts` implements the fixed-upstream server route. `auth-client.ts` is the official browser auth client. This is not Next.js: see the [TanStack Start guide](../../docs/stack/web-tanstack-start.md) and [feature architecture](../../docs/feature-architecture.md) before adding routes or data access.

## Commands

```sh
pnpm generate
pnpm --filter @tstack/web dev
pnpm --filter @tstack/web test
pnpm --filter @tstack/web typecheck
pnpm --filter @tstack/web build
pnpm --filter @tstack/web preview
pnpm --filter @tstack/web storybook
pnpm --filter @tstack/web storybook:build
```

Run from the boilerplate root after installation (`packages/boilerplate` when developing inside TStack). Start the API separately or use this workspace's `pnpm dev`. The web dev server defaults to port 3000; Storybook uses 6006. The welcome screen calls the generated health operation and shows loading, success, error and retry states.

## API connection

The SDK's browser URL defaults to `/api`. A TanStack Start server route forwards GET/POST through a native API Worker service binding when deployed, and through fixed server-only `API_URL` (default `http://127.0.0.1:4000`) in local development. Browser calls stay same-origin. Business `/api/me` maps to API `/me`; `/api/auth/*` retains its full path for Better Auth. The proxy preserves cookies, origin/fetch metadata, request bodies, status and separate `Set-Cookie` headers, does not follow upstream redirects, and disables caching. It never opens a database or imports backend code. Do not expose arbitrary upstream hosts, rewrite hostile origins into trusted ones or silently fall back to HTTP when a deployed binding is absent.

## Authentication

The official `better-auth/react` client handles sign-up, sign-in, session refresh and sign-out at same-origin `/api/auth`. `/login` offers email/password access (12-character minimum for registration). `/account` checks the session on the server through SDK `me` and redirects anonymous users to `/login`. The server function forwards only the current request's cookie to the API; it never stores a user's session in a global server client. Its response is private/no-store. The React session hook revalidates every 60 seconds while online and on focus/connectivity changes. The page hides protected content at known expiry or on revalidation error, and reloads its server data when the current identity changes. Server authorization always checks the database; periodic client updates are not instantaneous revocation notifications. Signing out here leaves other device sessions intact.

Configure a stable `BETTER_AUTH_SECRET` in the API before starting it. For local development or a web portal, set the API's `WEB_ORIGIN` and `BETTER_AUTH_URL` to this application's exact origin. In production, set the canonical auth URL and trusted web origin to the configured public HTTPS origins, not internal service-binding request URLs; the browser client still uses this application's same-origin proxy. A binding does not bypass CSRF/origin checks or API authorization. See the API README for session policy, migrations and security limits. Auth uses the official specialized client; all business API calls still use Orval.

The login form also offers **Use an email code** through the official `emailOTPClient()`: request, enter six digits, resend, change email or return to passwords. Codes expire in five minutes. Invalid/expired/exhausted codes and delivery/network failures remain recoverable errors without exposing internal details. Signup after code verification is server-owned. Read the [email-code policy](../../docs/stack/auth-guide.md#email-code-access), including native cleanup of unproven existing access and private local message capture.

The `tanstackStartCookies` plugin is not mounted here: it is for a Better Auth server instance hosted in Start. Our auth instance lives only in the Effect API, and the HTTP proxy relays its cookies. A future server-side auth mutation must explicitly relay its `Set-Cookie` response; do not assume the SDK or a server fetch updates browser cookies automatically.

## UI and stories

Keep shadcn/ui primitives in `src/components/ui`, shared web components in `src/components`, and feature-specific UI with its feature. `components.json` configures future shadcn CLI additions. Stories live next to components; `.storybook` configures the TanStack React/Vite integration. Stories do not need an API or database. Native Expo stories belong to the mobile workspace, not this DOM catalog.

Vitest tests exercise the status component through its generated SDK, including HTTP failure and retry, the credentialed HTTP proxy against a real local upstream, and account identity changes and failed revalidation through the router. Storybook demonstrates component variants; it does not replace unit or integration tests. No billing, organization model or product feature is configured.

## Runtime transport

`src/server.ts` composes TanStack Start's fetch handler with request-scoped runtime transport. Both the API proxy and generated SDK `me()` reads must use that request's native API service binding on Workers. The handwritten SDK fetch seam carries the binding; generated operations remain provider-neutral. Never change global fetch, store session credentials globally or expose bindings/server configuration through `VITE_*` variables. Local HTTP defaults to `http://127.0.0.1:4000` only for development.

Auth paths retain `/api/auth/*`; business paths strip only the leading `/api`. SSR session reads forward only the current request's cookie and set `private, no-store`; 401 means anonymous, while binding/storage/network failures remain errors. Missing deployed bindings fail closed, not as anonymous success or an implicit public-HTTP fallback.

## Cloudflare deployment

[ADR 0006](../../docs/adr/0006-cloudflare-only.md) selects Alchemy `2.0.0-beta.87` and Cloudflare only. This SSR app runs as a Worker on workerd with `nodejs_compat`, using a native binding to the API Worker/D1 backend. Bun `1.4.4` is local development/tooling, not the Worker runtime. There is no supported Node-server, Docker/Compose/Coolify, VM, tunnel or SSH deployment alternative. `preview` is local build inspection, not production hosting.

Use the [infrastructure README](../../infra/README.md) for exact integrated configuration/commands and [deployment](../../docs/stack/deployment.md) for deferred acceptance gates. Verify actual binding use, missing-binding failure, distinct Set-Cookie, no-store and concurrent SSR isolation under workerd and the separately approved public HTTPS route. Local Vitest/build checks do not prove production routes, limits or cookie/origin configuration. No cloud operation, even plan/state bootstrap, is authorized by this README.
