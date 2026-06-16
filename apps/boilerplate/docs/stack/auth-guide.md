---
title: Better Auth Guide
---

## Overview

The boilerplate uses Better Auth for email/password, Email OTP, GitHub OAuth, Twitter OAuth, and SIWE (Sign In With Ethereum). Middleware is private by default. Polar customers are created on signup through the Polar Better Auth plugin.

Read this before touching auth configuration, route guards, auth emails, SIWE verification, user lifecycle hooks, or session handling.

## Key Files

- `src/lib/auth/config.ts` — server-side Better Auth config composition
- `src/lib/auth/oauth.ts` — social provider configuration
- `src/lib/auth/rate-limit.ts` — rate-limit rules
- `src/lib/auth/email-hooks.ts` — auth email callbacks using `sendEmail`
- `src/lib/auth/user-hooks.ts` — change-email and delete-user hooks
- `src/lib/auth/plugins/` — Email OTP, Polar, and SIWE plugin wiring
- `src/lib/auth/side-effects.ts` — auth lifecycle/webhook bridge to feature services
- `src/lib/auth-client.ts` — client-side auth client, React hooks, and plugins
- `src/lib/auth.constants.ts` — OTP length, expiry, max attempts, password reset expiry
- `src/middleware.ts` — route protection, public route whitelist, and access gating
- `src/features/authentication/` — auth components, schemas, hooks, and SIWE verifier
- `src/lib/email/send-email.ts` — email dispatcher; dev logs, prod sends through Resend
- `src/lib/email/types.ts` — discriminated `EmailMessage` and `EmailResult` unions

## Auth Flows

### Email/password

- `requireEmailVerification: true` — users must verify before accessing protected routes.
- `autoSignInAfterVerification: true` — verified users are signed in automatically.
- Password reset is wired through `sendResetPassword()` in `src/lib/auth/email-hooks.ts`.
- Reset links expire in `AUTH_CONSTANTS.PASSWORD_RESET_EXPIRES_IN_SECONDS`.

### Email OTP

- Plugin: `emailOtpPlugin` in `src/lib/auth/plugins/email-otp.ts`.
- Client: `authClient.emailOtp.sendVerificationOtp()`.
- OTP length, expiry, and max attempts are defined in `src/lib/auth.constants.ts`.
- Sending goes through `sendOtp({ email, otp })`, which dispatches `{ type: "otp" }` through `sendEmail`.

### OAuth: GitHub and Twitter

- Providers are configured in `src/lib/auth/oauth.ts`.
- Providers are enabled only when the corresponding env vars are configured.
- `getAvailableOAuthProviders()` returns the providers available to the UI.
- Client sign-in uses `signIn.social({ provider: "github" })` or `"twitter"`.

### SIWE

- Plugin: `siwePlugin` in `src/lib/auth/plugins/siwe.ts`.
- The app domain comes from `env.projectUrl`.
- Verification delegates through `src/lib/auth/side-effects.ts` to `src/features/authentication/services/siwe-verifier.service.ts`.
- Client hook: `useEthereumAuth()` in `src/features/authentication/hooks/use-ethereum-auth.ts`.
- Flow: nonce → SIWE message → wallet signs → server verifies domain, nonce, address, chain ID, and signature → session created.
- `anonymous: true` allows wallet-only accounts without email.

## Rate Limiting

Rules live in `src/lib/auth/rate-limit.ts` and are passed into `betterAuth()` from `src/lib/auth/config.ts`.

The default rules include stricter windows for:

- `/sign-in/email`
- `/sign-up/email`
- `/email-otp/send-verification-otp`
- `/sign-in/email-otp`

Client-side handling in `src/lib/auth-client.ts` reads the `X-Retry-After` header and shows a localized message.

## Protecting Routes

Use one of the supported route protection patterns. Do not roll your own cookie/header parsing.

- Protected RSC pages: `auth.api.getSession({ headers: await headers() })` + `redirect(routes.auth.login)`.
- Server queries: `authed.query`.
- Server actions: `authed.action`.
- API routes: `authed.route`.
- Middleware: `auth.api.getSession` plus route whitelist/access checks in `src/middleware.ts`.

See `docs/stack/route-guard.md` for examples.

## Email Callbacks

Auth events trigger emails through callbacks in `src/lib/auth/email-hooks.ts`:

- `emailAndPassword.sendResetPassword` → `sendResetPassword()` → `{ type: "password-reset" }`
- `emailVerification.sendVerificationEmail` → `sendVerificationEmail()` → `{ type: "verification" }`
- `user.changeEmail.sendChangeEmailVerification` → `sendChangeEmailVerification()` → `{ type: "verification" }`
- `user.deleteUser.sendDeleteAccountVerification` → `sendDeleteAccountVerification()` → `{ type: "delete-account" }`
- Email OTP plugin → `sendOtp()` → `{ type: "otp" }`

Low-level delivery returns `EmailResult`. Auth hooks are the Better Auth boundary where delivery failures should be converted into auth-flow failures.

## User Deletion

`user.deleteUser.afterDelete` delegates to `onUserDeleted(user.id)`, which attempts Polar customer cleanup after the local Better Auth user has been deleted.

Current behavior:

- The local user deletion remains confirmed even if external Polar cleanup fails.
- Polar cleanup failures are logged with `userId` and a safe error message.
- Missing Polar customers should be treated as idempotent non-errors by the gateway.

If guaranteed external cleanup with retries is needed, add an explicit retry/outbox workflow instead of duplicating Polar cleanup in routes or making the Better Auth delete-user hook fail.

## Adding a New Auth Provider

1. Add env vars to `src/config/env.ts` under `oauth`.
2. Add the provider to `socialProviders` in `src/lib/auth/oauth.ts`.
3. Update `getAvailableOAuthProviders()` to include the provider only when configured.
4. Add a client-side button in `src/features/authentication/components/social-auth-buttons.tsx`.
5. Add env vars to `.env.example`.
6. Add or update tests for provider availability and UI behavior when practical.

## Auth Schemas

Schemas live in `src/features/authentication/schemas/auth.schema.ts`:

- `loginSchema` — email plus optional password/OTP.
- `signupSchema` — email plus optional password/confirmation/OTP, with refinement for password match.

Use `locales.errors.*` for validation messages.

## Auth Hook

`useAuthForm({ schema, mode, callbackURL, loginRedirectURL })` in `src/features/authentication/hooks/use-auth-form.ts` handles both email/password and OTP flows.

It manages:

- `codeSent`
- `emailNotVerified`
- `pendingVerificationEmail`
- resend verification email flow
- OTP completion
- redirect after successful login/signup
