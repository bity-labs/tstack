---
title: ADR 0004 - quality branch as integration gate before main
status: accepted
date: 2026-05-06
---

# 0004. `quality` branch as integration gate before `main`

Date: 2026-05-06
Status: Accepted

## Context

Most repositories PR feature branches directly into `main`, with `main` serving as both integration target and release source. The TStack monorepo contains multiple shippable surfaces, including the reusable harness, the documentation app, and the boilerplate. A broken `main` can block packaging, docs deployment, or later release automation.

Feature work also varies in scope: a small docs correction and a multi-feature auth/billing refactor can land in the same week. The team needs a place to batch validate integration before promoting to release.

## Decision

Use a long-lived `quality` branch as the integration target. Feature branches PR into `quality`. A merge from `quality` to `main` is the explicit release/promotion trigger.

## Consequences

Easier:

- A broken integration is recoverable on `quality`, not immediately promoted through `main`.
- Multiple unrelated changes can be batched and validated together before release.
- The merge from `quality` to `main` is a deliberate human action rather than a surprise release from any feature merge.

Harder:

- One extra PR step per change.
- Two long-lived branches create more rebase/merge-conflict management, especially for hotfixes.
- New contributors may branch from `main` by habit, so branch targeting must stay visible in issues and PRs.

## Alternatives considered

- **Trunk-based on `main`** — simpler and faster. Rejected because a regression on `main` can affect multiple product surfaces at once.
- **Release branches per release** — cleaner historical release records, but heavier process for a small team and less useful as an always-shippable integration lane.
