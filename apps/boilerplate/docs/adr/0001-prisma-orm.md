---
title: ADR 0001 - Use Prisma as the ORM
status: accepted
date: 2026-05-06
---

# 0001. Use Prisma as the ORM

Date: 2026-05-06
Status: Accepted

## Context

The boilerplate needs an ORM for PostgreSQL. The two realistic options at scaffolding time were Prisma and Drizzle. Drizzle has growing momentum in the Next.js ecosystem, with a closer-to-SQL DSL, smaller runtime, and better edge story.

The Agent-Ready Boilerplate is a customer-facing starter: every builder inherits the ORM choice and must live with it long-term. Migrations, seed data, schema diffs, and generated types all assume the ORM remains stable.

## Decision

Use Prisma. Schema lives at `apps/boilerplate/prisma/schema.prisma`; migrations live under `apps/boilerplate/prisma/migrations/`; generated client access is centralized through `prisma` from `@/lib/db`.

## Consequences

Easier:

- Mature ecosystem and documentation.
- Better Auth and Polar integrations work with Prisma adapters out of the box.
- Generated TypeScript types are exhaustive and stable across the schema.
- Migration tooling (`prisma migrate dev`, `prisma migrate deploy`) is well-trodden.

Harder:

- Heavier runtime than Drizzle because of the Prisma engine binary.
- Not edge-runtime friendly.
- The Prisma DSL hides SQL, so complex queries may fall back to `$queryRaw` and lose type safety.
- Switching to Drizzle later would be a full data-layer rewrite: schema, migrations, every query, and every service.

## Alternatives considered

- **Drizzle** — closer to SQL, smaller runtime, edge-friendly. Rejected because Better Auth and Polar adapter support was less mature at scaffolding time, and the boilerplate's primary value is that the stack works out of the box.
- **Kysely / raw SQL** — maximum control and no codegen. Rejected because it adds too much boilerplate for builders and does not provide a bundled migration story.
