---
title: Boilerplate Quick Reference
---

## Config

```typescript
import { env, routes } from "@/config";

env.database.url;
env.email.resendApiKey;
env.payment.polarServer;
env.upload.maxFileSizeBytes;

routes.auth.login; // "/login"
routes.dashboard; // "/dashboard"
routes.account.billing; // "/account/billing"
```

## Database

```typescript
import { prisma } from "@/lib/db";

// Schema: prisma/schema.prisma
// Migrations: prisma/migrations/
// Import the singleton from lib/db; do not instantiate PrismaClient directly.
export async function getUserProfile(userId: string) {
  return prisma.user.findUnique({ where: { id: userId } });
}
```

Put DB access in services or infrastructure modules. Queries, actions, and routes should call service functions.

## Handler Results

```typescript
import { authed, publicly, isResultSuccessful } from "@/lib/handler";

const result = await authed.query(async ({ user }) => ({ userId: user.id }));
if (isResultSuccessful(result)) {
  result.data.userId;
}
```

## Common Imports

| Pattern | Import |
|---|---|
| Environment | `env` from `@/config` |
| Routes | `routes` from `@/config` |
| Prisma client | `prisma` from `@/lib/db` |
| Auth server config | `auth` from `@/lib/auth/config` |
| Auth client | `authClient`, `signIn`, `signUp`, `signOut`, `useSession` from `@/lib/auth-client` |
| Authenticated action | `authed.action(...)` from `@/lib/handler` |
| Public action | `publicly.action(...)` from `@/lib/handler` |
| Authenticated query | `authed.query(...)` from `@/lib/handler` |
| Public query | `publicly.query(...)` from `@/lib/handler` |
| API route handlers | `authed.route(...)` / `publicly.route(...)` from `@/lib/handler` |
| Errors | `ServerError`, `UnauthorizedError`, `ValidationError` from `@/lib/errors` |
| Logger | `logger` from `@/lib/logger` |
| Analytics | `captureEvent` from `@/lib/tracking` |
| Email dispatcher | `sendEmail` from `@/lib/email/send-email` |
| Email types | `EmailMessage`, `EmailResult` from `@/lib/email/types` |
| File upload | `uploadImage` from `@/lib/file-upload` |
| Billing products | `getCheckoutProducts`, `getDisplayProducts` from `@/features/billing` or `@/features/billing/server-api` for auth/plugin bootstrapping |
| Polar gateway | `polar`, `polarClient`, `type PolarGateway` from `@/lib/polar` |
| Locales | `locales` from `@/locales` |
| Metadata | `createMetadata`, `getDefaultMetadata` from `@/lib/metadata` |

## Validation Commands

Run from the repository root.

```bash
pnpm --filter @tstack/boilerplate lint
pnpm --filter @tstack/boilerplate typecheck
pnpm --filter @tstack/boilerplate test
pnpm --filter @tstack/boilerplate build
```

For workspace-wide changes:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```
