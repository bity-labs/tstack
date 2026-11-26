# Feature architecture across independent applications

## Status

Accepted.

## Context

The SaaS workspace has an Effect API, TanStack Start web application, Expo native application, MCP adapter and generated SDK. Its initial modules were organized by technical convenience and had inconsistent web/native filenames. The former Next.js feature convention provided useful ownership boundaries but assumed Server Components, server actions and Prisma, which do not match this stack.

## Decision

Organize API/web/native capabilities under `src/features/<name>` with only the files needed by the capability. Use kebab-case custom filenames and responsibility suffixes. Keep contract-only API exports separate from handlers and runtime layers. Keep TanStack routes, startup and MCP registration as composition, and technical clients/database lifecycle outside business features. Cross-application business communication uses the generated SDK; authentication uses the official Better Auth protocol clients.

Public web/native feature APIs are client-safe `index.ts` exports; API contracts/handlers use explicit entry modules. Framework-required and generated names are exceptions. Do not impose Next.js actions, RSC queries, duplicate models, a repository layer or a shared DOM/native UI package.

Install generic engineering docs and skills as full local copies. The scaffold remains usable outside TStack without parent links; its project context and stack conventions are project-owned. The generic source package is unchanged.

## Rationale

Features keep related behavior discoverable while preserving different server/browser/native lifecycles. Small flat modules avoid creating a framework of empty layers. Explicit contract/runtime separation preserves offline OpenAPI generation. Local harness copies trade automatic synchronization for standalone portability.

## Consequences

Adding an API feature requires registering its contract and handlers explicitly. Feature imports must respect public surfaces, and shared infrastructure must not become a business-logic bucket. Copied harness updates require review; they do not update automatically. Existing HTTP URLs, operationIds, auth behavior, migration history and UI behavior are unchanged by the reorganization.

## Alternatives considered

- Copy the old Next.js overlay: rejected because its execution/data-access assumptions do not apply.
- Mandate every layer and folder: rejected because existing health/account endpoints do not need artificial services or repositories.
- Share backend feature implementations with clients: rejected because the public SDK contract is the cross-application boundary.
- Link installed harness assets to a parent workspace: rejected because exported projects must work alone.

## Review trigger

Revisit when real product capabilities require a different ownership boundary, multiple persistence implementations, mobile navigation, localization or more than one web UI consumer. Do not pre-create those abstractions before their requirements exist.
