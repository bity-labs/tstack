---
title: Polar Payments and Billing Guide
---

## Overview

Polar handles subscriptions, one-time purchases, customer benefits, and credit metering. This starter integrates Polar through the `@polar-sh/better-auth` plugin and accesses the SDK through a narrow `PolarGateway` abstraction.

Read this before touching checkout, subscription sync, credits, products/meters, benefits, webhooks, customer cleanup, or access gating.

## Key Files

- `src/lib/polar/client.ts` — Polar SDK client for sandbox/production.
- `src/lib/polar/polar-gateway.ts` — `PolarGateway` interface and SDK adapter.
- `src/lib/polar/index.ts` — exports `polarClient`, `polar`, and gateway types.
- `src/lib/auth/config.ts` — Better Auth config composition.
- `src/lib/auth/plugins/polar.ts` — Polar checkout, portal, usage, and webhook plugin wiring.
- `src/lib/auth/side-effects.ts` — auth lifecycle/webhook bridge to billing, SIWE, and Polar cleanup.
- `src/features/billing/server-api.ts` — narrow server-side billing surface used by auth side effects.
- `src/features/billing/` — subscription state, generated products/meters, credits, and order history UI.
- `src/features/benefits/` — one-time purchase benefits, downloadables, and GitHub repository access.
- `src/app/(protected)/success/page.tsx` — post-checkout subscription sync.
- `src/middleware.ts` — access gating.
- `polar/products.*.json` and `polar/meters.*.json` — product/meter configuration by environment.

## Architecture

```txt
Polar SDK client (src/lib/polar/client.ts)
    ↓
PolarGateway (src/lib/polar/polar-gateway.ts)
    ↓
Features
    ├── billing/  — subscriptions, products/meters, credits, order history
    └── benefits/ — downloadables and GitHub benefits for one-time purchases

Better Auth config (src/lib/auth/config.ts)
    └── Polar plugin (src/lib/auth/plugins/polar.ts)
        ├── checkout() — products from billing generated files
        ├── portal()   — customer portal
        ├── usage()    — credit metering
        └── webhooks() — subscription/order event handlers
```

Auth lifecycle and webhook side effects are centralized in `src/lib/auth/side-effects.ts`, which delegates subscription sync and checkout product lookup to billing through `src/features/billing/server-api.ts`.

Use that narrow server API instead of the `@/features/billing` barrel from auth/plugin initialization. The barrel also exposes UI, hooks, and queries that can pull route-handler/auth config dependencies back into auth initialization.

## Checkout Flow

1. Better Auth checkout plugin creates a checkout session with products from `src/features/billing/generated/products.generated.ts`.
2. Success URL: `/success?checkout_id={CHECKOUT_ID}`.
3. Success page calls `syncSubscriptionFromPolar(userId)` from `@/features/billing`.
4. Billing service fetches active subscriptions through `polar.fetchActiveSubscriptions(userId)`.
5. Subscription state is upserted locally through `syncSubscription()`.
6. User is redirected to the dashboard.

## Webhook Flow

Webhooks are handled by the Better Auth Polar plugin in `src/lib/auth/plugins/polar.ts` and verified by the plugin.

- `onCustomerStateChanged` delegates to `onPolarCustomerStateChanged(externalId, activeSubscriptions)`, then billing syncs the local subscription row.
- `onOrderPaid` logs order info and is the extension point for order side effects.
- `onPayload` logs webhook receipt for observability.

Rules:

- Webhook handlers must be idempotent under replay.
- Side effects must key on stable Polar IDs, never webhook arrival order.
- Do not add a parallel webhook route unless an ADR explicitly changes the integration boundary.

## Subscription Service

`src/features/billing/services/subscription.service.ts` owns local subscription state.

```typescript
getUserSubscription(userId);        // Get local subscription record
hasActiveSubscription(userId);      // Check if status === "active"
syncSubscription(userId, subs);     // Upsert from Polar webhook/customer state
deleteSubscription(userId);         // Remove local record
syncSubscriptionFromPolar(userId);  // Fetch through PolarGateway + sync
```

## Required Polar Token Scopes

### Runtime app token (`POLAR_ACCESS_TOKEN`)

Grant only the scopes used by current runtime code:

```txt
checkouts:write
customers:read
customers:write
orders:read
events:read
events:write
customer_sessions:write
customer_portal:read
customer_portal:write
```

Why:

- `checkouts:write` — Better Auth Polar checkout creates checkout sessions.
- `customers:read` — customer lookup/state reads, including active subscriptions, granted customer benefits, and active meter balances.
- `customers:write` — customer creation on signup and customer deletion/cleanup by external ID.
- `orders:read` — billing overview/order history.
- `events:write` — usage/credit event ingestion.
- `events:read` — usage history listing.
- `customer_sessions:write` — creates customer sessions before using Customer Portal APIs.
- `customer_portal:read` / `customer_portal:write` — Customer Portal API access for customer-owned benefits/downloadables and hosted portal flows.

Optional: add `customer_meters:read` only if you explicitly build against Better Auth usage customer-meter endpoints. The bundled app does not call `authClient.usage.meters.*` directly.

Not required for current code paths:

```txt
benefits:read
benefits:write
meters:read
meters:write
webhooks:read
webhooks:write
subscriptions:read
subscriptions:write
checkout_links:read
checkout_links:write
discounts:read
discounts:write
refunds:read
refunds:write
files:read
files:write
license_keys:read
license_keys:write
metrics:read
organizations:read
organizations:write
```

Clarifications:

- Benefit display does **not** require `benefits:read`; the app reads customer-owned benefit grants/downloadables via Customer Portal APIs and customer state.
- Webhook receiving uses `POLAR_WEBHOOK_SECRET`; the app does not create/update Polar webhook endpoints via API.
- Meters are used conceptually for usage billing, but current runtime records/lists events and reads active meter balances from customer state. It does not manage Polar meter definitions through `client.meters.*`.

### CLI product management token (`tstack products --token ...`)

Current CLI product sync/cleanup flows require only:

```txt
products:read
products:write
```

`products:write` creates, updates, archives, and unarchives Polar products. `products:read` gets/lists products for sync status and cleanup/orphan detection.

## Products and Meters

Product and meter definitions live under `polar/`:

- `polar/products.sandbox.json`
- `polar/products.production.json`
- `polar/meters.sandbox.json`
- `polar/meters.production.json`
- matching JSON schemas and examples

Generated TypeScript lives under `src/features/billing/generated/`:

- `products.generated.ts`
- `meters.generated.ts`

Rules:

- Keep product/meter JSON, generated TypeScript, and Polar dashboard state in sync.
- Do not hand-edit generated TypeScript unless the task is explicitly about maintaining generated output.
- `tstack products` regenerates both `products.generated.ts` and `meters.generated.ts` from local JSON.
- The CLI syncs products to Polar, but it does not sync meter definitions to Polar.
- Local meter generation does not need `meters:read` or `meters:write`; a future Polar meter-sync feature would need both scopes.
- `getCheckoutProducts(env)` returns only products with a valid Polar product ID.
- `getDisplayProducts(env)` returns products for pricing/plan UI.
- `getMeters(env)` / `getMeter(env, slug)` expose meter config for credit usage.

## Billing Overview and Orders

Billing pages use `getBillingOverviewQuery()` from `@/features/billing`. The query calls billing services and the Polar gateway instead of reaching into the SDK directly from UI components.

```typescript
const [subscription, orders] = await Promise.all([
  getUserSubscription(user.id),
  polar.listUserOrders(user.id),
]);
```

## Credit Metering

Credit services live under `src/features/billing/services/`.

### Check credits

```typescript
getCreditsBalance(userId, meterId);
hasCredits(userId, meterId, requiredAmount);
assertHasCredits(userId, meterId, requiredAmount);
```

`assertHasCredits` throws `UnauthorizedError` when credits are insufficient or cannot be verified.

### Consume credits

```typescript
ingestUsage(userId, { name: "use-credit", metadata: { source: "feature" } });
```

`polar.recordUsage` logs errors but does not roll back already-completed product behavior. If a future feature needs strict accounting, design an explicit outbox/retry workflow.

### Pattern for credit-consuming actions

```typescript
export const myAction = authed
  .input(mySchema)
  .action(async ({ input, user }) => {
    await assertHasCredits(user.id, METER_ID, 1);

    const result = await doExpensiveOperation(input);

    await ingestUsage(user.id, {
      name: "use-credit",
      metadata: { feature: "my-feature" },
    });

    return result;
  });
```

## Benefits and One-Time Purchases

One-time purchase benefits live in `src/features/benefits/` and read from the Polar customer portal through `PolarGateway`:

- `hasActiveOrder(userId)` — checks for any active benefit grant.
- `getDownloadables(userId)` — lists downloadable files.
- `getGitHubBenefits(userId)` — lists GitHub repository grants.

## Customer Lifecycle

1. Signup → `createCustomerOnSignUp: true` in the Polar plugin.
2. Checkout → customer state synced via webhook and success-page sync.
3. Active use → credits checked/consumed via billing services and the Polar gateway.
4. Account deletion → `onUserDeleted(userId)` attempts Polar customer cleanup after local user deletion.

Local account deletion must not be blocked by third-party cleanup unless a future ADR introduces a retry/outbox guarantee.

## Environment Variables

```txt
POLAR_ACCESS_TOKEN       # SDK access token with the runtime scopes listed above
POLAR_SERVER             # "sandbox" or "production"
POLAR_WEBHOOK_SECRET     # webhook signature verification; no webhooks:* scopes needed
POLAR_ORGANIZATION_ID    # organization identifier
```

## Access Gating

Middleware checks access through feature services.

```typescript
import { hasActiveSubscription } from "@/features/billing";
import { hasActiveOrder } from "@/features/benefits";

const hasUserAccess = await hasActiveSubscription(userId);
// const hasUserAccess = await hasActiveOrder(userId);
// const hasUserAccess = await hasActiveSubscription(userId) || await hasActiveOrder(userId);
```

Choose one access model and keep the route guard behavior documented in `docs/stack/route-guard.md`.
