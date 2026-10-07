# Dependency Updates

Renovate configuration lives in root `renovate.json`.

## Policy

- Target the `v2` development branch.
- Allow routine updates on Mondays, all day, in UTC. This is an allowed window, not a guarantee of an exact execution time; the Renovate service controls when it runs.
- Group minor and patch updates across the workspace into one maintenance PR, including associated lockfile changes.
- Keep major upgrades in separate PRs.
- Convert direct npm dependency ranges to exact versions in an initial grouped pinning PR. Preserve peer dependency compatibility ranges.
- Disable automerge. Review updates and require passing CI before merging.
- Allow vulnerability-fix PRs outside the weekly window when GitHub vulnerability alerts are available. Security fixes are separate from the routine group.

Existing manifests are not immediately rewritten by adding this configuration. Renovate proposes pinning and update changes, including `pnpm-lock.yaml`, for review.

## Activation

1. Install/enable the Renovate GitHub App for this repository.
2. Make this configuration available on the repository's default branch (or in Renovate's onboarding configuration). Renovate reads repository configuration from the default branch even when `baseBranchPatterns` targets `v2`; a file only on `v2` does not activate it if another branch is the default.
3. Enable GitHub's dependency graph and Dependabot alerts in repository settings. Configure alert notifications for the maintainers who should receive them. Renovate's security PRs rely on these alerts; this file alone does not enable GitHub scanning or notifications.
4. Avoid enabling Dependabot routine version-update PRs alongside Renovate. If Renovate owns security-fix PRs, avoid enabling duplicate Dependabot security-update PRs as well.
5. Establish required PR checks and branch protection before relying on updates being safe to merge. The existing release workflow is not a PR quality gate.

## Changing the frequency

Edit `schedule` in `renovate.json`. It currently uses the cron expression `* * * * 1` (Mondays). To allow daily updates, use `* * * * *`. Change `timezone` if a local update window is preferred. Vulnerability alerts and security-fix PRs remain independent of the routine schedule.

When development moves away from `v2`, update `baseBranchPatterns` to the intended target branch, or remove it to use the default branch.

## Validation

Run the official validator after configuration changes:

```sh
pnpm dlx --package=renovate renovate-config-validator renovate.json
```

## References

- [Renovate configuration options](https://docs.renovatebot.com/configuration-options/)
- [Renovate GitHub App](https://github.com/apps/renovate)
