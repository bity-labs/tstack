---
title: Route Guard Guide
---

## Purpose

This file documents request-time protection for pages, queries, API routes, and middleware. All patterns are authoritative for this application; do not roll your own session checks.

## Three Protection Patterns

Pick by surface area.

### 1. Protected RSC page: inline check

Use when an entire page should redirect unauthenticated users to login.

```typescript
import { routes } from "@/config";
import { auth } from "@/lib/auth/config";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function ProtectedPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect(routes.auth.login);
  return <Dashboard user={session.user} />;
}
```

### 2. Authenticated data fetching: `authed.query`

Use for server-side queries that require a user. The handler receives `{ user, session }` guaranteed non-null. The wrapper converts failures into `Result<T>`.

```typescript
import { authed } from "@/lib/handler";
import { getUserProfile } from "../services/user-profile.service";

export const getProfileQuery = () =>
  authed.query(async ({ user }) => {
    return getUserProfile(user.id);
  });
```

Use `publicly.query` when the session may be null.

### 3. Secure API route or action: `authed.route` / `authed.action`

Use for API routes and server actions that require a user. Chain `.input(schema)` for Zod input validation.

```typescript
import { z } from "zod";
import { authed } from "@/lib/handler";

const postSchema = z.object({ title: z.string().min(1) });

export const POST = authed
  .input(postSchema)
  .route(async ({ user, input }) => ({ created: true, userId: user.id, input }));
```

For public API routes/actions, use `publicly.route` or `publicly.action`.

## Rule of Thumb

- Page that should redirect on failure → inline `auth.api.getSession` + `redirect(routes.auth.login)`.
- Data for a page/component → `authed.query` or `publicly.query`.
- Route handler in `app/api/.../route.ts` → `authed.route` or `publicly.route`.
- Mutations from forms/components → `authed.action` or `publicly.action`.

## Middleware Pattern

Middleware is private by default. It applies three route categories:

1. **Landing mode** — when `LANDING_MODE=true`, only landing + legal pages are accessible.
2. **Public routes** — exact match list (`/`, `/home`, `/login`, `/pricing`, legal pages, etc.) plus public prefixes such as `/blog`.
3. **Access-gated routes** — protected authenticated routes that additionally require subscription/order access.

Public route lists and access-gated route lists live in `src/middleware.ts`.

```typescript
// In middleware.ts — choose one access model:
const hasUserAccess = await hasActiveSubscription(userId); // subscription
// const hasUserAccess = await hasActiveOrder(userId); // one-time purchase
// const hasUserAccess = await hasActiveSubscription(userId) || await hasActiveOrder(userId); // hybrid
```

Rules:

- Keep `AUTH_API_PREFIX` public so Better Auth endpoints can operate.
- Keep `AUTH_API_PREFIX` allowed during landing mode so public pages can resolve `useSession()` state correctly.
- Keep static assets, images, sitemap, manifest, and analytics ingest excluded from the matcher.
- Do not duplicate route lists across features. Update `src/config/routes.ts` and `src/middleware.ts` together when adding protected routes.
- If access gating changes from subscription-only to one-time or hybrid, update `docs/context.md` and this file.

## Related Docs

- Better Auth providers, flows, rate limits, and lifecycle hooks: `docs/stack/auth-guide.md`.
- Error classes used by the wrappers: `docs/server-patterns.md`.
- Subscription/order access helpers: `docs/stack/payments-polar.md`.
