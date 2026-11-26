# TanStack Start web application

This application uses TanStack Start and Router, React, Vite and generated SDK clients. It is not Next.js: do not add `app/page.tsx`, RSC data-query conventions, Next middleware or `"use server"` / `"use client"` directives.

## Routing and SSR

- `src/routes/__root.tsx` owns the document, `HeadContent`, `Scripts`, query provider and `Outlet`. `src/router.tsx` creates a router and its own QueryClient; never cache user sessions or query clients in process-wide server state.
- Route modules use `createFileRoute`. `index.tsx` is public home and `login.tsx` renders the authentication feature. Use the route's `head` option for page metadata, not Next.js metadata exports.
- `_authenticated.tsx` is a pathless layout. Its `beforeLoad` calls `getCurrentUser`, redirects missing sessions to `/login`, and returns the user in route context. `_authenticated.account.tsx` remains URL `/account`; its loader reads that validated context and delegates rendering to `AccountScreen`.
- The route context is one navigation's validated snapshot, not the authorization authority or an indefinitely fresh session. Keep client revalidation, identity-change invalidation and hidden protected content on expiry/failure. The API authorizes every business request even when a web guard passed earlier.
- `src/lib/session.functions.ts` exports the existing `createServerFn` bridge. It reads request-scoped cookies and calls SDK `me` through the API Worker service binding when deployed, or fixed `API_URL` locally. It preserves private/no-store, returns null only for a 401, and fails closed on unavailable binding/storage/network.
- `src/routes/api.$.ts` uses `server.handlers` for same-origin GET/POST proxying. Its `api-proxy.server.ts` implementation uses a fixed configured upstream, relays origin/cookies and distinct Set-Cookie headers, and does not follow auth redirects. It is not a second business API.

## Reads, mutations and boundaries

Use loaders to orchestrate route data. Use the generated HTTP SDK in request-aware SSR bridges and generated React Query hooks where client caching is useful. Do not add `createServerFn` wrappers around every business operation or import API implementations. Validate untrusted inputs at a server-function boundary if adding one; the API still validates and authorizes the operation.

Business mutations call the SDK and invalidate the affected generated query keys when cached data changes. Better Auth protocol calls use its official React client. A `.query.ts` module is optional, only for handwritten query configuration that adds value; a pass-through wrapper around an Orval hook is unnecessary.

Simple screens can use loader data directly. If a future screen combines loader prefetch and React Query, explicitly configure hydration and cache ownership to avoid duplicate reads or cross-request leakage. Do not assume that installing React Query enables SSR dehydration automatically.

Client-safe feature exports live in `features/<name>/index.ts`. Explicit `.functions.ts` exports contain Start server functions, whose handlers are transformed by Start; `.server.ts` implementation modules stay server-only. Do not re-export server implementations through a client-safe feature barrel. The Vite/Start build checks these boundaries; file naming alone is not a security mechanism.

## UI and checks

Feature UI belongs in its feature; shared shadcn primitives stay in `src/components/ui`. Tests and stories are colocated with components. `.storybook` configures only web Storybook. Use Vitest for route/component behavior and test anonymous access, identity switches, expiry/failure, SSR cache headers and cookie forwarding against the real API when changing these boundaries.

## Deployment

The [Cloudflare-only strategy](../adr/0006-cloudflare-only.md) retains TanStack Start SSR as a Worker on workerd with `nodejs_compat`, managed by Alchemy `2.0.0-beta.87`. Bun `1.4.4` is local development/tooling, not its deployed runtime. The server uses a native API Worker service binding for both proxy and SSR SDK calls; the handwritten SDK fetch seam keeps generated operations provider-neutral. Local HTTP remains a development fixture, not a supported self-hosting target. Missing deployed bindings must fail closed, not fall back to local/public HTTP. Never mutate global fetch or cache a transport containing user credentials globally.

Browser SDK/auth calls remain same-origin. Public auth/trusted origins must describe actual deployed HTTPS origins, not internal binding request URLs. Preserve original origin/CSRF metadata and API authorization even on a native binding. Website/docs remain static assets on Cloudflare; that is not a reason to export the authenticated Start app as static HTML. No Node-server, Docker/Compose/Coolify, VM, tunnel or SSH provisioning alternative is supported.

Keep runtime entry points server-only and preserve request-scoped session/QueryClient ownership. Validate binding use, missing-binding failure, concurrent requests, distinct Set-Cookie and no-store under local workerd and separately approved live routes. See [deployment](deployment.md) and the [infrastructure README](../../infra/README.md) for configuration and deferred checks. No cloud operation, even plan/state bootstrap, is authorized by these docs.
