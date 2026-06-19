---
title: ADR 0002 - Use Better Auth for authentication
status: accepted
date: 2026-05-06
---

# 0002. Use Better Auth for authentication

Date: 2026-05-06
Status: Accepted

## Context

This starter ships with multiple auth flows out of the box: email/password with verification, Email OTP, GitHub OAuth, Twitter OAuth, and SIWE (Sign In With Ethereum). Product teams need to add providers, rate-limit rules, email callbacks, and lifecycle hooks without rewriting middleware or route guards.

Auth.js / NextAuth is the historical default in the Next.js ecosystem and the option many readers expect. Choosing another provider needs a durable reason.

## Decision

Use Better Auth. Server config is composed in `src/lib/auth/config.ts` with providers, hooks, and plugins under `src/lib/auth/`; client config lives in `src/lib/auth-client.ts`. Session checks are funneled through `auth.api.getSession`, `authed.query`, `authed.action`, and `authed.route` rather than reconstructed inline.

## Consequences

Easier:

- First-class plugin model for Email OTP, SIWE, Polar, and anonymous wallet accounts.
- TypeScript-first API with a typed session shape end to end.
- Built-in DB-backed rate limiting with per-route customization.
- Polar customer creation on signup is handled through plugin configuration.

Harder:

- Smaller community than Auth.js, so there are fewer examples and answers.
- Plugin compatibility is a real risk: upstream Better Auth or Polar plugin changes can affect subscription sync.
- Migrating to Auth.js later would mean rewriting auth tables, session shape, hooks, plugins, and route guards.

## Alternatives considered

- **Auth.js / NextAuth** — largest ecosystem and most documentation. Rejected because the plugin model felt heavier for this multi-flow setup, especially SIWE + Email OTP + Polar.
- **Clerk / Supabase Auth** — managed services. Rejected because they add vendor dependency and pricing/runtime assumptions to a self-hostable starter.
