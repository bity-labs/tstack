# TStack Context

## Purpose

TStack provides composable, reusable setup components. Builders can adopt them independently rather than installing one mandatory environment. This repository contains source assets and tooling, not personal vault contents, live assistant state, or server secrets.

## Current Workspace

| Path | Responsibility | Status |
| --- | --- | --- |
| `apps/documentation` | TStack's public Fumadocs documentation | Existing app |
| `apps/boilerplate-website` | Product commercial/marketing website | Minimal runnable static Astro scaffold (welcome page) |
| `apps/boilerplate-application` | Product web application | README placeholder |
| `apps/boilerplate-api` | Shared backend for web and mobile applications | README placeholder |
| `apps/boilerplate-mobile-application` | Optional product mobile application | README placeholder |
| `apps/boilerplate-docs` | Product customer documentation | Minimal Nimbus Docs scaffold with introduction page |
| `packages/brain` | Second-brain/vault folder setup and skills | README placeholder |
| `packages/harness` | Generic engineering instructions, skills, and doctrine | Existing template assets |
| `packages/assistant` | Hermes-based coordination setup | README placeholder |
| `packages/os` | Server setup assets | README placeholder |
| `packages/cli` | Shared setup entry point | Retained CLI; v2 scaffolding unavailable |

The CLI's `ready` and `products` commands retain legacy configuration behavior for existing compatible projects. They do not implement the new component setup. `init` reports that v2 scaffolding is not implemented yet.

## Agreed Boundaries

- Maintain one pnpm/Turborepo source workspace, with applications under `apps/*` and reusable components under `packages/*`.
- Keep reusable components independently usable. Integration is optional.
- Develop boilerplate apps in this root workspace, not in a nested monorepo.
- The planned boilerplate includes a website, web application, shared API, optional mobile application, and product documentation. The API is the shared backend for the web and mobile applications; clients consume its API rather than importing server or database implementation.
- The planned boilerplate export is one standalone pnpm/Turborepo project with independently deployable apps; mobile is optional. Exporting required shared packages is future work.
- Asset packages need not be JavaScript libraries. README-only placeholders have no package manifests, scripts, or runtime behavior.
- Keep personal installations, credentials, and runtime data outside TStack.

## Documentation Ownership

- `apps/documentation` documents TStack itself; `apps/boilerplate-docs` is the documentation app shipped with a builder's product.
- Root `docs/` contains internal project context, standards, and ADRs.
- `packages/harness/templates/default` owns the platform-independent engineering harness.
- Root `.agents` and `docs/engineering` link to that generic template. Editing them changes the shared source of truth.
- `AGENTS.md`, `docs/context.md`, `docs/coding-standards.md`, and `docs/adr/**` are real project-owned files.
- Standalone installs must copy harness files so they work without this checkout.

## Agreed Application Stacks

These are target stack decisions, not implemented boilerplate applications or completed migrations:

| Application | Target stack |
| --- | --- |
| `apps/boilerplate-website` | Astro |
| `apps/boilerplate-application` | Next.js 16 App Router with Effect v4 and shadcn/ui |
| `apps/boilerplate-api` | Effect v4 with its compatible platform/HTTP API tooling and OpenAPI |
| `apps/boilerplate-mobile-application` | React Native with the latest stable Expo SDK and Effect v4 |
| `apps/boilerplate-docs` | Nimbus Docs (`@cloudflare/nimbus-docs`), built on Astro |
| `apps/documentation` | Planned rewrite from Fumadocs to Nimbus Docs |

The shared API targets Node.js. Application code should use TypeScript. Use framework-native build tooling: Vite through Astro, Next.js tooling for the web application, and Metro through Expo for mobile. The API uses `tsc` to compile TypeScript to JavaScript without bundling; its development runner is `tsx watch`. Vitest is the default test runner for non-mobile apps and platform-independent shared TypeScript logic. Use Jest with `jest-expo` and React Native Testing Library for Expo/React Native component tests; do not force Vitest onto native mobile tests. Device/E2E testing is a separate decision.

Nimbus refers to [Nimbus Docs](https://nimbus-docs.com/get-started/). Its scaffold provides project-owned layouts, components, styles, and content alongside package-provided infrastructure. The existing TStack documentation app still uses Fumadocs until the rewrite is implemented.

### Initial Scaffolding Scope

- Create minimal runnable scaffolds for the five boilerplate applications using their agreed stacks: a welcome page/screen for frontend and documentation apps, and a health endpoint for the API.
- Do not add authentication, databases, product features, or cross-app integration in this initial scope. Effect remains part of the agreed web/mobile/API stacks, but scaffolding does not require a shared client or end-to-end feature.
- Keep the existing TStack documentation migration from Fumadocs to Nimbus as separately scoped work. Preserve existing content and public URLs wherever possible; provide redirects for unavoidable URL changes.
- The Next.js web application uses App Router under `src/app/`, Tailwind CSS, and shadcn/ui. Keep UI scaffolding minimal: initialize shadcn/ui and add only what the welcome page needs; do not add a dashboard template or full component catalog.
- The Expo mobile application uses Expo Router with a single welcome screen. Do not scaffold tabs, an authentication flow, or additional product screens.
- The Astro website starts as a static site with one welcome page and plain CSS, without React integration or an additional UI library.
- Nimbus product documentation starts with its minimal scaffold and one introduction page, without invented product documentation or additional features.
- The API scaffold exposes an OpenAPI-described `GET /health` endpoint returning `{"status":"ok"}`, using Effect v4-compatible HTTP API tooling, without database access or authentication.
- Do not introduce shared runtime packages during initial scaffolding. Each app starts independently; shared tooling configuration follows in the quality-tooling work, and shared API contracts can be introduced when integration begins.
- Version targets: the latest stable Next.js 16 release, the latest stable Expo SDK with its supported React/React Native versions, and Effect v4 across the API, web, and mobile apps. Resolve and pin exact compatible versions at implementation time. Use Effect v4 as explicitly requested, including v4 prereleases if needed, without a separate release-status approval gate. Align compatible platform/testing packages with v4 rather than assuming v3 package names or configuration still apply.
- These are scope decisions, not implemented scaffolds. Remaining framework versions and scaffold options must be finalized before implementation.

### API Build Contract

- Target the repository's Node.js 24 runtime with ESM (`"type": "module"`) and API-specific TypeScript `module`/`moduleResolution` settings of `NodeNext`.
- Development: `tsx watch src/main.ts`.
- Typecheck: `tsc --noEmit`, using a checking configuration that includes relevant source and tests.
- Build: `tsc` with a dedicated build configuration that emits application JavaScript into `dist/` and excludes tests. Use Node-compatible import paths; do not assume TypeScript rewrites path aliases.
- Production entry point: `node dist/main.js`. Deploy compiled output with its required production dependencies, including required shared workspace packages; this is not a standalone bundle.
- Tests: Vitest with a compatible `@effect/vitest` version for Effect-aware tests.
- These are planned commands and constraints. The API remains a README-only placeholder until implementation is scoped.

## Agreed Quality Tooling

- Use Prettier for repository-wide formatting, with framework-specific plugins where needed (for example Astro). Formatting is separate from linting.
- Enable TypeScript `strict` across runnable applications and TypeScript packages. Shared strictness settings must preserve framework-specific TypeScript configuration and module resolution rather than impose a single Node-oriented tsconfig on every workspace.
- Effect is used in the API, web application, and mobile application. Select compatible TypeScript/Effect versions and verify typechecking in all three environments. Keep Node-only Effect platform adapters out of browser and native mobile code; choose platform integrations according to each runtime.
- Use ESLint for code-quality checks, with TypeScript's recommended type-aware rules and framework-specific configurations for Astro, Next.js, and Expo. Prevent unhandled promises; require explicit justification for `any` and rule-disable comments. Treat lint warnings as CI failures. Keep formatting rules with Prettier rather than duplicating them in ESLint.
- Test-runner choices are recorded under Agreed Application Stacks. Documentation link checking is excluded from the initial quality-tooling scope. Device/E2E testing is deferred.
- Collect test coverage for visibility without an initial enforced percentage threshold. Affected workspace tests must pass; an established test suite unexpectedly running zero tests must fail validation. README-only placeholders remain exempt. Coverage thresholds can be revisited once meaningful suites exist.
- These are tooling decisions only; configuration and dependencies have not yet been added.

## Agreed PR Validation Scope

- Validation applies to every PR, including human-authored changes and automated dependency/security updates.
- Validate changed workspaces and their transitive dependent apps/packages against the PR's target branch. Unrelated workspaces should not run application checks.
- Global tooling configuration changes validate all runnable workspaces; workspace-specific configuration changes validate that workspace and its dependents.
- Narrow lockfile-update validation only when affected workspaces can be identified reliably; otherwise validate all runnable workspaces.
- For Expo mobile, the initial PR build check is a production bundle/export check, not Android/iOS native compilation. Expo EAS native builds and their CI integration are deferred, as is E2E testing; these checks must not be presented as native build or device-test coverage.
- Affected runnable workspaces must pass formatting, lint, typecheck where applicable, automated tests, and build checks. Checks must be meaningful rather than placeholder scripts that report success; README-only placeholders are exempt.
- Internal README/documentation-only changes require formatting checks, not link checks or unrelated application tests. Documentation app content changes also validate that app's build. Markdown extensions alone are not sufficient grounds to skip application validation: files that serve as build, runtime, or exported template inputs must be treated according to their consumers.
- Every PR must report one stable aggregate status, `PR validation`. It passes only when all applicable checks pass, or reports an explicit no-applicable-checks success when no runnable workspaces require validation. Detection errors and failed or unexpectedly skipped required checks must fail the gate.
- Branch protection must require `PR validation` to pass before merging; a failed workflow alone does not enforce this restriction.
- PR validation uses read-only repository permissions and does not expose deployment credentials or release secrets. Fork PRs must be validated without access to secrets; publishing and deployment remain separate workflows. These restrictions also apply to automated dependency-update PRs.
- New commits to a PR cancel superseded validation runs for that same PR. The latest commit must complete validation; cancellation must not affect other PRs or separate release/deployment workflows.
- These are agreed validation rules, not an implemented PR workflow or configured branch protection.

## Open Decisions

Component internals, installation contracts, provider choices, runtime/deployment targets, and stack-specific quality tooling remain undefined. Decide these incrementally when implementing the relevant component; do not infer them from the previous starter.

## References

- [Agent guidance](../AGENTS.md)
- [Coding standards](coding-standards.md)
- [Workspace architecture](adr/0001-composable-v2-workspace.md)
