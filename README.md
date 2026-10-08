<p align="center">
  <img src="apps/documentation/public/logo.png" alt="TStack logo" width="180" />
</p>

<h1 align="center">TStack</h1>

TStack is a composable collection of reusable setup assets for a brain/vault, engineering harness, assistant, server, and product boilerplate. It uses one pnpm/Turborepo source workspace. Components are intended to be adopted independently; personal data, secrets, and live runtime state belong outside this repository.

## Current status

V2 is an empty shell around the existing generic harness, the migrated Nimbus Docs documentation app, and customer-facing CLI package. The new component directories are README placeholders, except for `apps/boilerplate-website`, which starts as a minimal runnable static Astro scaffold (welcome page). Further V2 scaffolding is not implemented yet.

For the previous starter and its instructions, see the [preserved v1 documentation](https://github.com/bity-labs/tstack/tree/v1/apps/documentation/content/docs).

## Layout

```text
apps/
  documentation/             TStack's public documentation, now on Nimbus Docs.
  boilerplate-website/       Minimal runnable static Astro scaffold (welcome page).
  boilerplate-application/   Minimal runnable Next.js 16 welcome scaffold.
  boilerplate-api/           Placeholder: shared web/mobile backend.
  boilerplate-mobile-application/ Minimal runnable Expo scaffold (single welcome screen).
  boilerplate-docs/          Placeholder: product documentation.
packages/
  brain/                    Placeholder: vault folder setup and skills.
  harness/                  Generic engineering harness templates.
  assistant/                Placeholder: Hermes-based coordination setup.
  os/                       Placeholder: server setup assets.
  cli/                      Retained customer-facing TStack CLI.
docs/                       Internal context, standards, and ADRs.
```

The planned boilerplate export is a standalone pnpm/Turborepo workspace containing independently deployable website, web application, shared API, optional mobile application, and product documentation apps. Its implementation and shared packages are not defined yet.

## Repository development

Use Node.js 24 LTS and pnpm 10.28.1 (the version pinned in `package.json`).

```sh
pnpm install --frozen-lockfile
pnpm dev:documentation
```

Validate the implemented workspaces from the repository root:

```sh
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

README-only placeholders do not participate in Turbo tasks. The documentation app intentionally has no test script; its build, typecheck, ESLint lint, and Nimbus authoring lint are real checks. Workspace test scripts collect coverage, and existing suites fail when they collect zero tests.

## Deferred decisions

- [ ] Decide browser and mobile E2E testing tools, critical user journeys, and CI execution policy later. E2E implementation is deferred; no tool has been selected.
- [ ] Configure Expo EAS native builds later, including build profiles, credentials, triggers, and CI integration. Initial mobile PR validation uses a production bundle/export check, not Android/iOS native compilation.

## Dependency maintenance

Root `renovate.json` configures weekly updates on Mondays (UTC), exact direct dependency pins, one grouped minor/patch PR across the monorepo, separate major-upgrade PRs, and no automerge. It covers external dependencies in `apps/*` and `packages/*`, including associated lockfile changes; it does not bump workspace packages' own release versions. README-only placeholders become eligible when manifests are added.

See [dependency update policy and activation instructions](docs/dependency-updates.md). The configuration alone does not activate Renovate or GitHub vulnerability notifications.

### TODO after merging v2 into the default branch

- [ ] Install/enable the Renovate GitHub App for this repository and complete onboarding with the committed configuration.
- [ ] Remove `baseBranchPatterns: ["v2"]` from `renovate.json` to target the default branch after v2 development moves there; otherwise updates will continue targeting `v2`.
- [ ] Enable GitHub's dependency graph and Dependabot alerts, and configure maintainer notification preferences.
- [ ] Keep Dependabot routine version updates disabled to avoid duplicate Renovate PRs; choose one owner for security-fix PRs too.
- The `PR validation` GitHub Actions workflow ([docs/pr-validation.md](docs/pr-validation.md)) already validates affected workspaces with lint, typecheck, tests, build, and formatting against each PR's actual target branch; the following owner actions remain pending.
- [ ] Configure branch protection/rulesets that require the `PR validation` status check (plus PR review) before merging so the gate is enforced.
- [ ] Verify Renovate and security-fix PRs run the same gate once the Renovate GitHub App is activated; keep security Fix/patch PRs covered by `pull_request` triggers (no secrets, no `pull_request_target`).
- [ ] Review and merge Renovate's initial dependency-pinning PR, including lockfile changes; verify subsequent minor/patch updates are grouped and major upgrades remain separate.
- [ ] Confirm vulnerability alerts and out-of-schedule security-fix PRs are enabled; enable secret scanning and push protection where available.

## CLI status

```sh
pnpm tstack --help
```

`tstack init` reports that v2 scaffolding is unavailable. `ready` and `products` remain legacy commands for existing compatible projects, not a v2 setup workflow. See [the CLI README](packages/cli/README.md) for local development and optional global linking.

## Harness reuse

The generic harness source lives in `packages/harness/templates/default`. This monorepo reuses it through two symlinks:

- `.agents` → `packages/harness/templates/default/.agents`
- `docs/engineering` → `packages/harness/templates/default/docs/engineering`

Editing these linked assets changes the reusable template. Project-owned `AGENTS.md`, context, standards, and ADRs remain real files. Installed projects must receive copies, not symlinks back to this checkout.

Start with [project context](docs/context.md), [coding standards](docs/coding-standards.md), and the [workspace ADR](docs/adr/0001-composable-v2-workspace.md).
