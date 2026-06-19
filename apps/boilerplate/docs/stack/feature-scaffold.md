---
title: Feature Scaffold Guide
---

## Overview

Features live in `src/features/{feature-name}/`. Each feature is a self-contained module with typed file suffixes and a public API through `index.ts`.

Use this guide when adding a new feature or restructuring an existing one.

## Directory Structure

```txt
src/features/{feature-name}/
├── index.ts              # Public API for imports outside the feature
├── models/
│   └── {name}.model.ts   # TypeScript interfaces and domain types
├── schemas/
│   └── {name}.schema.ts  # Zod validation schemas
├── services/
│   └── {name}.service.ts # Business logic and persistence calls
├── queries/
│   └── {name}.query.ts   # Server-side data fetching for RSC
├── actions/
│   └── {name}.action.ts  # Server actions ("use server")
├── hooks/
│   └── use-{name}.ts     # Client-side React hooks
└── components/
    └── {name}.tsx        # Feature-specific UI components
```

Not every folder is required. Create only the surface the feature needs.

## Step-by-Step: Creating a New Feature

### 1. Define the model

```typescript
// src/features/my-feature/models/my-feature.model.ts
export interface MyFeatureResult {
  id: string;
  name: string;
  createdAt: Date;
}
```

Rules:

- Use domain names from `docs/context.md`.
- Prefer explicit model types at feature boundaries.
- Use branded/value types when plain strings or numbers would hide important meaning.

### 2. Create the schema

```typescript
// src/features/my-feature/schemas/my-feature.schema.ts
import { z } from "zod";
import { locales } from "@/locales";

export const createMyFeatureSchema = z.object({
  name: z.string().min(1, locales.errors.validationFailed),
});

export type CreateMyFeatureInput = z.infer<typeof createMyFeatureSchema>;
```

Rules:

- Use `locales.errors.*` for validation messages.
- Export both schema and inferred type when callers need the input type.
- Use schema factory functions when validation depends on runtime config, such as upload limits.
- Use `.refine()` for cross-field or file validation.

### 3. Write the service

```typescript
// src/features/my-feature/services/my-feature.service.ts
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

export async function getMyFeature(userId: string, id: string) {
  return prisma.myFeature.findFirst({ where: { id, userId } });
}

export async function createMyFeature(userId: string, data: { name: string }) {
  logger.info("Creating feature", { userId, name: data.name });
  return prisma.myFeature.create({
    data: { ...data, userId },
  });
}
```

Rules:

- Prefer pure async functions over classes for feature services.
- Keep Prisma access in services or infrastructure modules.
- Log boundary-relevant context with `logger`, never raw secrets or provider tokens.
- Use typed errors or explicit result unions for expected failures.
- Use `locales` for user-facing error messages.

### 4. Create the query

```typescript
// src/features/my-feature/queries/my-feature.query.ts
import { authed } from "@/lib/handler";
import { getMyFeature } from "../services/my-feature.service";

export const getMyFeatureQuery = (id: string) =>
  authed.query(async ({ user }) => {
    return getMyFeature(user.id, id);
  });
```

Rules:

- A query is usually a factory function that returns `publicly.query()` or `authed.query()`.
- Use closure arguments for parameters like IDs or filters.
- The handler receives `{ session }` for public queries or `{ session, user }` for authenticated queries.
- Queries return `Result<T>` from the wrapper.
- Call service functions; do not duplicate persistence logic in queries.

### 5. Create the action

```typescript
// src/features/my-feature/actions/my-feature.action.ts
"use server";

import { revalidatePath } from "next/cache";
import { ServerError } from "@/lib/errors";
import { authed } from "@/lib/handler";
import { locales } from "@/locales";
import { createMyFeatureSchema } from "../schemas/my-feature.schema";
import { createMyFeature } from "../services/my-feature.service";

export const createMyFeatureAction = authed
  .input(createMyFeatureSchema)
  .action(async ({ input, user }) => {
    try {
      const result = await createMyFeature(user.id, input);
      revalidatePath("/dashboard");
      return { success: true, data: result };
    } catch {
      throw new ServerError(locales.errors.serverError);
    }
  });
```

Rules:

- Always start action files with `"use server"`.
- Use `publicly` for public actions and `authed` for actions requiring a user.
- Chain `.input(schema).action(handler)` for validated input.
- Log before/after important provider or persistence operations.
- Throw typed errors with localized user-facing messages.

### 6. Create the component

```typescript
// src/features/my-feature/components/my-feature-form.tsx
"use client";

import { useAction } from "next-safe-action/hooks";
import { createMyFeatureAction } from "../actions/my-feature.action";

export function MyFeatureForm() {
  const { execute, isExecuting } = useAction(createMyFeatureAction);
  // ...
}
```

Rules:

- Feature components may handle feature-specific business logic, API calls, auth UI state, and error states.
- Reusable presentation primitives belong under `src/components/` or `src/components/ui/`.
- Client components must not import server services, Prisma, Better Auth server config, Polar SDK, email sending, or storage modules.
- Feature components use their own feature's actions/hooks. Cross-feature UI should be composed by a page or orchestrator, not by deep internal imports.

### 7. Set up the index

```typescript
// src/features/my-feature/index.ts

// Models
export type { MyFeatureResult } from "./models/my-feature.model";

// Schemas
export { createMyFeatureSchema } from "./schemas/my-feature.schema";
export type { CreateMyFeatureInput } from "./schemas/my-feature.schema";

// Services
export { getMyFeature, createMyFeature } from "./services/my-feature.service";

// Queries
export { getMyFeatureQuery } from "./queries/my-feature.query";

// Actions
export { createMyFeatureAction } from "./actions/my-feature.action";

// Components
export { MyFeatureForm } from "./components/my-feature-form";
```

Rules:

- Organize exports by: models/types → schemas → services → queries → actions → hooks → components.
- External imports should go through `index.ts` by default.
- Use `export type` for type-only exports.
- If a feature needs a server-only surface for auth/bootstrap code, add `server-api.ts` and export only the narrow functions/types needed there.

### 8. Add locales

```typescript
// src/locales/index.ts
export const locales = {
  MyFeaturePage: {
    metadata: {
      title: "My Feature - MyApp",
      description: "Description for SEO",
    },
    title: "My Feature",
    createButton: "Create",
  },

  MyFeatureForm: {
    nameLabel: "Name",
    submitButton: "Create Feature",
  },

  errors: {
    validationFailed: "Validation failed",
  },
} as const;
```

Rules:

- Pages get a `PageNamePage` key with a nested `metadata` object.
- Reusable components get a component-named key.
- Error messages go in top-level `errors`.
- Success messages go in top-level `success`.

### 9. Add page metadata

```typescript
import { createMetadata, getDefaultMetadata } from "@/lib/metadata";
import { locales } from "@/locales";

export const metadata = createMetadata({
  ...getDefaultMetadata(),
  title: locales.MyFeaturePage.metadata.title,
  description: locales.MyFeaturePage.metadata.description,
});
```

## File Naming Conventions

| Type | Suffix | Example |
|---|---|---|
| Model | `.model.ts` | `subscription.model.ts` |
| Schema | `.schema.ts` | `newsletter.schema.ts` |
| Service | `.service.ts` | `credits.service.ts` |
| Query | `.query.ts` | `subscription.query.ts` |
| Action | `.action.ts` | `newsletter.action.ts` |
| Hook | `use-{name}.ts` | `use-credits.ts` |
| Component | `{name}.tsx` | `credit-balance.tsx` |

## Existing Features for Reference

| Feature | Complexity | Good example of |
|---|---:|---|
| `newsletter` | Simple | Public action + schema + service + form |
| `blog` | Simple/medium | Content model and marketing UI |
| `billing` | Medium/complex | Generated product/meter config, services, queries, hooks, UI |
| `benefits` | Medium | Downloadables and GitHub benefit queries/services |
| `authentication` | Complex | Schemas, auth UI, SIWE verification, client hooks |
| `settings` | Complex | Server actions, file upload, auth client updates |

## Validation Checklist

Before finishing a feature scaffold:

- [ ] Feature has only the folders it needs.
- [ ] External imports use the feature public API or a narrow `server-api.ts`.
- [ ] Server-only code stays out of client components.
- [ ] User-facing copy is in `locales`.
- [ ] Queries/actions/routes use `authed` or `publicly` wrappers.
- [ ] Persistence code lives in services/infrastructure modules.
- [ ] Relevant behavior is covered by tests where practical.
