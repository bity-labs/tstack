---
title: ADR 0003 - Use Polar for billing, subscriptions, and credit metering
status: accepted
date: 2026-05-06
---

# 0003. Use Polar for billing, subscriptions, and credit metering

Date: 2026-05-06
Status: Accepted

## Context

This starter needs a billing provider that handles subscriptions, one-time purchases, customer benefits, and metered credit usage. Stripe is the industry default and the path most builders know. Choosing otherwise needs to clear a high bar.

Polar is purpose-built for software companies and digital products. It provides customer portal, usage-based billing, benefits/downloadables, and a first-party Better Auth plugin that handles customer creation, webhook verification, checkout, and portal integration.

## Decision

Use Polar through the `@polar-sh/better-auth` plugin. Customers are created on signup. Subscription state is synced through webhooks (`onCustomerStateChanged`) and the post-checkout success page. Subscription state, generated products/meters, and credit metering live under `src/features/billing/` and use `PolarGateway` through `src/lib/polar/`.

## Consequences

Easier:

- Customer lifecycle is wired into auth: signup creates a Polar customer and user deletion attempts Polar cleanup.
- Webhook signature verification and customer portal wiring are handled by the Better Auth plugin.
- Subscriptions, one-time purchases, benefits/downloadables, and credit metering share one provider.
- The app can isolate provider details behind `PolarGateway` and feature services.

Harder:

- Polar has a smaller ecosystem than Stripe and fewer third-party integrations.
- The Polar API surface is younger and may change faster, so SDK pinning and changelog review matter.
- Migrating to Stripe later would require rewriting customer linkage, webhook handlers, product/meter config, benefits, and credit-metering services.

## Alternatives considered

- **Stripe** — most mature provider with broad tax/fraud/integration support. Rejected because the starter's SaaS-shaped feature set would require more custom code, while Polar plus Better Auth removes much of the integration burden.
- **Lemon Squeezy / Paddle** — merchant-of-record options. Rejected because they are less aligned with the credit-metering and software-benefit use cases.
