# ADR 0001: Composable V2 Workspace

## Status

Accepted

## Context

TStack is expanding beyond a single application starter to reusable brain, harness, assistant, server, and boilerplate setup. The product boilerplate will separate its commercial website, application, and customer documentation. We need clear ownership without maintaining nested development workspaces or mixing reusable assets with personal installations.

## Decision

Maintain one pnpm/Turborepo source workspace:

- Runnable applications belong under `apps/*`.
- Reusable components and setup tooling belong under `packages/*`.
- The three boilerplate apps are developed directly in the root workspace. Their planned export is one standalone workspace with independently deployable apps and required shared packages.
- Components are independently usable; cross-component integration is optional.
- Personal data, secrets, and live runtime state stay outside the repository.
- The engineering harness remains platform-independent. Project-owned context is separate from reusable doctrine.

## Rationale

One source workspace provides shared orchestration and straightforward cross-component changes. Separate component boundaries support independent adoption. Keeping installed state elsewhere makes the source reusable rather than tied to one person's environment.

## Consequences

- TStack documentation and the boilerplate's product documentation are separate apps.
- The future exporter must select the boilerplate apps and their required packages, rather than copy one application directory.
- Placeholder components can remain README-only until implementation is defined.
- Independent deployments and optional integrations must be preserved as behavior is added.

## Alternatives Considered

- Separate source repositories per component — adds coordination overhead before component interfaces are established.
- A nested boilerplate monorepo — introduces a second source workspace to maintain.
- One mandatory integrated installation — prevents independent component adoption.

## Review Trigger

Revisit if component ownership, release needs, or dependency constraints make a shared source workspace impractical.
