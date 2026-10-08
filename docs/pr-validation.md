# PR Validation

Every pull request in this repository is validated by the `PR validation`
workflow (`.github/workflows/pr-validation.yml`). Its aggregate `PR validation`
check is intended to be a required merge check; enforcement requires branch
protection or a ruleset that the repository owner still has to enable (see the
README checklist).

## What runs on a pull request

1. **Detection** computes the affected runnable workspaces for the pull request
   against **its actual target branch** (`github.event.pull_request.base.sha`),
   not a hardcoded default branch. Detection logic (`scripts/pr-validation/`)
   analyses the changed-file list and, for lockfile changes, the lockfile diff.
   A detection error (for example a broken base SHA) makes the workflow fail.
2. **Workspace checks** run as one job per affected runnable workspace with the
   workspace's available tasks (`lint`, `typecheck`, `test`, `build`) via
   Turbo. The Expo app's only build task is its production bundle/export
   check; there is no Android/iOS native compilation or device coverage.
3. **Repository formatting** (`pnpm format:check`) always runs, even when no
   workspace needs application checks.
4. **Aggregate gate** (`PR validation` job) combines the three results:
   - Success requires the detection, workspace-checks (when any job was
     scheduled) and formatting results to be exactly `success`. A `failed`,
     `cancelled` or unexpectedly `skipped` job fails the gate.
   - When the selection is empty the gate explicitly reports
     "no application checks were applicable" and still requires the
     formatting check to pass.
   - A missing or unparsable detection result fails the gate.

## Workspace selection rules

- Changed files inside an app/workspace select that workspace.
- Shared workspace packages additionally select their **transitive dependents**
  (resolved through `workspace:` package manifest references).
- Global tooling files (`package.json`, `turbo.json`, `pnpm-workspace.yaml`,
  `.prettierrc.json`, `.prettierignore`) select every runnable workspace.
- Lockfile changes narrow validation **only** when every changed lockfile hunk
  can be attributed to a workspace importer in the diff; otherwise
  (`lockfileAmbiguous`) every runnable workspace is validated. Unattributable
  hunks (package-snapshot-only hunks, root importer changes) always fall back
  to the full set rather than risk validating nothing.
- Internal README/docs-only changes select no workspace: they run repository
  formatting only. Documentation-app content under
  `apps/documentation/src/content/` or `apps/boilerplate-docs/src/content/`
  selects the corresponding app for building. Markdown inside a runnable
  workspace that is consumed by build/runtime/template tooling (anything that
  is not an internal docs basename or inside a `docs/` folder) selects that
  workspace — markdown is classified by its consumers, not by file extension.
- README-only placeholders (`packages/brain`, `packages/harness`,
  `packages/assistant`, `packages/os`) participate in repository formatting
  only.

## Permissions and fork safety

The workflow runs on the `pull_request` event (opened/synchronize/reopened) so
human, fork, Renovate, and security-fix PRs are all validated with the same
gate. It uses only `contents: read` permissions and no secrets or tokens are
read into steps beyond the safe default checkout token; untrusted PR code is
never executed with `pull_request_target`.
`concurrency: pr-validation-<PR number>` cancels superseded runs for the same
PR only — other PRs and separate release/deployment workflows are unaffected,
and the latest commit must complete validation.

Coverage artifacts are uploaded per workspace for visibility (no coverage
threshold is enforced).

## Simulating a pull request

The workflow also accepts `workflow_dispatch` with an `pr_number` input. In
that mode it resolves the pull request's `base.sha`/`head.sha` through the
GitHub API and runs the same detection and validation path without opening a
test PR.

## Testing the detection and gate logic

```sh
node --test scripts/pr-validation/
```

The tests cover, among others: website-only selection, shared-package
transitive consumers, global tooling changes, workspace config + dependents,
README/docs-only exclusions, documentation content builds, template-consumed
markdown, ambiguous and attributable lockfile diffs, new-importer lockfile
hunks, unknown base refs, empty selections, and gate semantics for
failed/cancelled/skipped jobs and unparsable selection output. The suites run
on Node's built-in test runner with no additional dependencies, so they run
without installing workspace packages.

## Not covered by this workflow

- Branch protection or rulesets requiring `PR validation` before merge remain
  an owner action (see the README checklist).
- Renovate activation, GitHub vulnerability-notification setup, and the
  default-branch transition from `v2` are documented manual steps.
- Documentation link checking, browser/mobile E2E testing, Expo EAS native
  builds and device tests, and deployment/publishing are intentionally out of
  scope.
