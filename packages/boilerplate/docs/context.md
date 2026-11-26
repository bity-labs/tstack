# Project context

## Starter scope

This repository is a customizable SaaS foundation, not a defined product domain. It includes an Effect HTTP API, a TanStack Start web application, an Expo native application, an Orval SDK, a local stdio MCP health tool, a commercial Astro site and public Nimbus documentation. Cloudflare is the only deployment target, managed through Alchemy `2.0.0-beta.87` with the Alchemy Better Auth integration: API/web Workers on workerd/nodejs_compat, D1, static website/docs and a native web→API service binding. Bun `1.4.4` is local development/tooling; local SQLite is a development fixture, not a self-hosting target. No Node-server, VM, Docker/Compose/Coolify, tunnel or SSH provisioning path is supported. Real deployment and recovery validation remain deferred. See [deployment](stack/deployment.md).

Email/password registration, passwordless email-code access, session restoration, current-user profile and sign-out exist. Better Auth owns OTP generation, hashing, expiry and verification. Local development captures emails offline; deployed delivery is wired to Cloudflare Email Sending but requires domain onboarding and live acceptance. Billing, organizations, tenants, product projects, password recovery UI, social providers and hosted authenticated MCP are not configured. Do not infer product business rules from illustrative examples in documentation. Replace this context as real requirements are decided.

## Vocabulary and ownership

- **Account**: the current authenticated user's safe profile returned by API `GET /me`; not a separate tenant or organization.
- **Authentication**: Better Auth protocol and session lifecycle; the API owns the server through the Alchemy integration and its environment's database. Browser and native official clients maintain independent device sessions.
- **System**: infrastructure availability, currently `GET /health` checking application database access; health is not proof of recovery or availability guarantees.
- **Feature**: a capability module owned by one application, not a shared backend implementation imported by clients.
- **SDK**: the generated business API contract consumer used across web, native and MCP. Auth protocol uses official Better Auth clients separately.
- **Deployment environment**: required stable `DEPLOY_NAME` project identity, explicit stage, Cloudflare account, state and D1/binding identities. Resource names use `<DEPLOY_NAME>-cloudflare-<stage>-<role>` consistently. Distinct applications need distinct project identities; stages isolate their environments. Changing names can create separate resources, not transfer data.
- **Technical docs**: this `docs/` directory for agents and developers. **Product docs**: public content in `apps/docs`; do not confuse their audiences.

The commercial site and public documentation belong to this SaaS when copied out. TStack's own commercial/documentation sites and tooling live outside this workspace and are not required at runtime or during installation.

## Sources of truth

- API feature schemas and `.api.ts` modules define the business HTTP contract; root `contract.ts` assembles it.
- OpenAPI and the Orval SDK are generated artifacts, not separately authored contracts.
- [Feature architecture](feature-architecture.md) defines application boundaries; [coding standards](coding-standards.md) defines naming and checks.
- [ADRs](adr/) record durable decisions; GitHub issues may specify work when this project uses GitHub. No issue tracker or credentials are configured by installing the harness.

UI and documentation are currently English. Localization, navigation beyond the existing native screen, deployment domains, payment providers and production service objectives require separate requirements. The current strategy and lifecycle decisions are [ADRs 0004 and 0006](README.md#deployment-decisions); ADRs 0002, 0003 and 0005 preserve historical decisions. Installation authorizes no cloud operation, even plan/state bootstrap, migration, export or restore. SQLite→D1 is not an automatic/transparent migration. EAS and an MCP HTTP service remain separate scope. Domain modeling principles apply without a mandatory Domain layer or event sourcing.
