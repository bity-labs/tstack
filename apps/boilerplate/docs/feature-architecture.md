---
title: Boilerplate Feature Architecture
---

## Purpose

Use this file when adding or changing application structure in `apps/boilerplate`.

The boilerplate uses Next.js App Router plus feature modules under `src/features/`. Generic engineering doctrine stays in `docs/engineering/`; this file only documents the concrete app layout.

## App Router Groups

```txt
src/app/
├── (auth)/          # Login, signup, reset, forgot-password
├── (landing)/       # Pre-launch / email-capture landing page
├── (marketing)/     # Public home, pricing, blog, legal pages
├── (protected)/     # Authenticated account, dashboard, checkout success
└── api/             # API route handlers
```

Route constants live in `src/config/routes.ts`. Prefer route constants over hard-coded paths in redirects, navigation, and middleware.

## Feature Structure

```txt
src/features/{feature-name}/
├── index.ts              # Public API for imports outside the feature
├── models/               # TypeScript interfaces and domain types
├── schemas/              # Zod validation schemas
├── services/             # Business logic and persistence calls
├── queries/              # Server-side data fetching for RSC
├── actions/              # Server actions ("use server")
├── hooks/                # Client-side React hooks
└── components/           # Feature-specific UI components
```

Only create folders a feature needs. Small features may have only an action, schema, service, and component.

## Public API Pattern

Each feature should export its stable external surface through `index.ts`.

```typescript
// src/features/newsletter/index.ts
export { NewsletterForm } from "./components/newsletter-form";
export { subscribeToNewsletterAction } from "./actions/newsletter.action";
export { newsletterSchema } from "./schemas/newsletter.schema";
```

Rules:

- External imports should go through `@/features/{feature}` by default.
- Feature internals may use relative imports inside the same feature.
- If bootstrapping code needs a server-only subset, expose a narrow `server-api.ts` rather than importing UI/hooks into infrastructure. `src/features/billing/server-api.ts` is the reference pattern.
- Avoid deep cross-feature imports. If a use case spans multiple features, introduce a small orchestrator or server API instead of coupling feature internals.

## Components

- **Feature components** live in `src/features/{feature}/components/`. They may use feature actions, queries, hooks, schemas, and domain-specific state.
- **Application components** live in `src/components/`. They are reusable across routes and features.
- **UI primitives** live in `src/components/ui/`. Keep these generic; do not bury feature business logic in them.
- Client components must not import server-only services, Prisma, Better Auth server config, Polar SDK, email sending, or storage modules.

## Locales and Metadata

User-facing strings and metadata should live in `src/locales/index.ts` so builders have one place to customize copy.

Recommended shape:

```typescript
export const locales = {
  metadata: { /* global app metadata */ },
  errors: { /* shared error messages */ },
  success: { /* shared success messages */ },
  common: { /* shared labels: save, cancel, loading */ },

  HomePage: { metadata: { title, description }, hero: { /* ... */ } },
  LoginPage: { metadata: { title, description } },

  NewsletterForm: { title, emailLabel, submitButton },
} as const;
```

Use metadata helpers from `@/lib/metadata`:

```typescript
import { createMetadata, getDefaultMetadata } from "@/lib/metadata";
import { locales } from "@/locales";

export const metadata = createMetadata({
  ...getDefaultMetadata(),
  title: locales.LoginPage.metadata.title,
  description: locales.LoginPage.metadata.description,
});
```

## Schema Validation

Schemas live with the feature and should use localized messages.

```typescript
import { z } from "zod";
import { locales } from "@/locales";

export const newsletterSchema = z.object({
  email: z.string().email(locales.errors.invalidEmail),
});
```

Rules:

- Export the schema and the inferred input type when callers need it.
- Use schema factories when validation depends on runtime config, such as upload limits.
- Use `.refine()` for cross-field or file validation.
- Keep validation messages in `locales.errors` unless the message is one-off developer-only text.

## Current Feature Modules

| Feature | Role | Notes |
|---|---|---|
| `authentication` | Login, signup, reset password, Email OTP, OAuth, SIWE UI/services. | Auth provider wiring lives in `src/lib/auth/*`. |
| `billing` | Subscriptions, products/meters, credits, order history, billing UI. | Exposes `server-api.ts` for auth/plugin bootstrapping. |
| `benefits` | Downloadables and GitHub benefits for one-time purchases. | Reads through `PolarGateway`. |
| `blog` | Marketing blog content rendering. | Content source is Velite/MDX. |
| `newsletter` | Email capture flow. | Good reference for a small feature. |
| `settings` | Account/profile/password/image settings. | Uses file upload and Better Auth client flows. |

## When to Add an ADR

Add an ADR under `docs/adr/` when a change introduces or revises:

- provider choices,
- feature/module ownership boundaries,
- data model ownership,
- auth, billing, storage, or security invariants,
- integration/release process decisions.
