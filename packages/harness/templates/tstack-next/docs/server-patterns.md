---
title: Server Patterns
---

## Purpose

Use this file when writing server-side behavior in this application: RSC queries, server actions, API routes, error handling, email, and file upload flows.

The central wrappers live in `src/lib/handler.ts`:

- `publicly.query` / `authed.query`
- `publicly.action` / `authed.action`
- `publicly.route` / `authed.route`
- optional `.input(schema)` validation for actions and route handlers

## Queries for RSC

Queries return `Result<T>`: `{ data: T, error: null } | { data: null, error: string }`.

```typescript
import { authed, publicly } from "@/lib/handler";
import { getUserProfile } from "../services/user-profile.service";

export const getMarketingDataQuery = () =>
  publicly.query(async ({ session }) => {
    return { isSignedIn: !!session?.user };
  });

export const getProfileQuery = () =>
  authed.query(async ({ user }) => {
    return getUserProfile(user.id);
  });
```

Rules:

- Use `authed.query` when a user is required; it resolves and validates the session.
- Use `publicly.query` when a session is optional.
- Prefer calling service functions from queries. Do not duplicate persistence logic in the query layer.
- Let the wrapper convert expected errors into `Result<T>`.

## Server Actions

Action files start with `"use server"` and should use the handler wrappers.

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { authed } from "@/lib/handler";
import { updateProfile } from "../services/profile.service";
import { updateProfileSchema } from "../schemas/profile.schema";

export const updateProfileAction = authed
  .input(updateProfileSchema)
  .action(async ({ input, user }) => {
    const profile = await updateProfile(user.id, input);
    revalidatePath("/account/general");
    return { success: true, data: profile };
  });
```

Rules:

- Use `publicly` for unauthenticated actions such as newsletter signup.
- Use `authed` for account, billing, dashboard, or settings actions.
- Validate input with Zod via `.input(schema)`.
- Throw typed errors from `@/lib/errors` for expected failures.
- Log important boundary events with `logger` and safe metadata.

## API Routes

Route handlers should use `authed.route` or `publicly.route`.

```typescript
import { z } from "zod";
import { authed, publicly } from "@/lib/handler";
import { createPost } from "@/features/posts";

export const GET = publicly.route(async ({ session }) => {
  return { isAuthenticated: !!session?.user };
});

const postSchema = z.object({ title: z.string().min(1) });

export const POST = authed
  .input(postSchema)
  .route(async ({ user, input }) => {
    const post = await createPost(user.id, input);
    return { post };
  });
```

Rules:

- Use `.input(schema)` for route query/body parsing.
- GET input is parsed from search params; non-GET input is parsed from JSON.
- The route wrapper returns `ApiResponse<T>` JSON with appropriate status codes.
- Do not manually reconstruct sessions in route handlers.

## Error Handling

Typed errors live in `src/lib/errors.ts` and are classified by `src/lib/handler.ts`.

```typescript
import { ServerError, UnauthorizedError, ValidationError } from "@/lib/errors";

throw new UnauthorizedError();
throw new ValidationError("Bad input");
throw new ServerError("Upstream unavailable", 503);
```

Rules:

- Use typed errors for expected application failures.
- Use explicit result unions when a caller should branch on success/failure.
- Never swallow errors. Log at boundaries and either return a failure result or throw a typed error.
- Avoid defensive fallbacks for values that must exist. Fail loudly with a useful typed error.

## Email

Low-level email sending uses a discriminated message union.

```typescript
import { sendEmail } from "@/lib/email/send-email";
import type { EmailMessage, EmailResult } from "@/lib/email/types";

const message: EmailMessage = {
  type: "verification",
  to: user.email,
  data: { token, url },
};

const result: EmailResult = await sendEmail(message);
if (!result.success) {
  throw new ServerError(result.error.message);
}
```

Built-in auth emails are adapted in `src/lib/auth/email-hooks.ts`:

- `{ type: "otp" }` — 6-digit verification code
- `{ type: "verification" }` — email verification/change-email link
- `{ type: "password-reset" }` — password reset link
- `{ type: "delete-account" }` — account deletion confirmation

Templates live in `src/components/emails/`. In development, `sendEmail` logs through `logger`; in production, it sends through Resend using `env.email.fromAddress`.

## File Uploads

Profile image upload uses `uploadImage` from `@/lib/file-upload`.

```typescript
import { uploadImage } from "@/lib/file-upload";

const imageUrl = await uploadImage(image, user.id);
```

Rules:

- `env.upload.provider` chooses `database` or `digitalocean`.
- `database` stores base64 in the `File` table and serves through `/api/files/{id}`.
- `digitalocean` uploads through the S3-compatible DigitalOcean Spaces client and returns the CDN URL when configured.
- Validate file type and size before upload. Current limits come from `env.upload.maxFileSizeBytes`.
- Download routes must avoid exposing files across users or access boundaries.

## Logging and Telemetry

```typescript
import { logger } from "@/lib/logger";
import { captureEvent } from "@/lib/tracking";

logger.info("Profile updated", { userId });
captureEvent("profile_updated", { source: "settings" });
```

Rules:

- Log boundary events and failures with safe context: user IDs, provider IDs, route/action names.
- Do not log secrets, tokens, raw webhook payload secrets, email contents, or full payment data.
- Use `captureEvent` instead of provider SDKs in feature code.
- Keep telemetry names stable and tied to observable product behavior.
