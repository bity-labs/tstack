import { it, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { analyze } from "./analysis.mjs";
import { computeTransitiveDependents } from "./graph.mjs";
import { createWorkspaceFixture } from "./fixtures.mjs";

let fixture;

beforeEach(() => {
  fixture = createWorkspaceFixture({
    "apps/boilerplate-api": { name: "@tstack/boilerplate-api" },
    "apps/boilerplate-application": {
      name: "@tstack/boilerplate-application",
      dependencies: { "@tstack/boilerplate-api": "workspace:*" }
    },
    "apps/boilerplate-docs": {
      name: "@tstack/boilerplate-docs",
      devDependencies: { "@tstack/boilerplate-api": "workspace:*" }
    },
    "apps/boilerplate-mobile-application": { name: "@tstack/boilerplate-mobile-application" },
    "apps/boilerplate-website": { name: "@tstack/boilerplate-website" },
    "apps/documentation": { name: "@tstack/documentation" },
    "packages/cli": { name: "@tstack/cli" }
  });
});

afterEach(() => fixture.cleanup());

const ALL_RUNNABLE = [
  "apps/boilerplate-api",
  "apps/boilerplate-application",
  "apps/boilerplate-docs",
  "apps/boilerplate-mobile-application",
  "apps/boilerplate-website",
  "apps/documentation",
  "packages/cli"
];

function analyzeWith(changedFiles, extra = {}) {
  return analyze({
    changedFiles,
    lockfileDiff: extra.lockfileDiff,
    graph: fixture.graph(),
    allRunnable: extra.allRunnable ?? ALL_RUNNABLE
  });
}

/** Wraps raw unified-diff body lines in a plausible pnpm-lock.yaml diff. */
function libraryDiff(lines) {
  return [
    "diff --git a/pnpm-lock.yaml b/pnpm-lock.yaml",
    "index 1111111..2222222 100644",
    "--- a/pnpm-lock.yaml",
    "+++ b/pnpm-lock.yaml",
    ...lines
  ].join("\n");
}

it("selects a website-only change without running unrelated app checks", () => {
  const res = analyzeWith(["apps/boilerplate-website/src/pages/index.astro"]);
  assert.deepEqual(res.selection, ["apps/boilerplate-website"]);
  assert.equal(res.evaluateAll, false);
  assert.equal(res.formattingOnly, false);
});

it("adds transitive dependents for a shared package change", () => {
  fixture.writeWorkspaceManifest("packages/boilerplate-shared", {
    name: "@tstack/boilerplate-shared"
  });
  fixture.writeWorkspaceManifest("apps/boilerplate-api", {
    name: "@tstack/boilerplate-api",
    dependencies: { "@tstack/boilerplate-shared": "workspace:*" }
  });
  const res = analyze({
    changedFiles: ["packages/boilerplate-shared/src/index.ts"],
    graph: fixture.graph(),
    allRunnable: [...ALL_RUNNABLE, "packages/boilerplate-shared"]
  });
  assert.deepEqual([...res.selection].sort(), [
    "apps/boilerplate-api",
    "apps/boilerplate-application",
    "apps/boilerplate-docs",
    "packages/boilerplate-shared"
  ]);
});

it("selects every runnable workspace for global tooling files", () => {
  for (const file of ["turbo.json", "pnpm-workspace.yaml", ".prettierrc.json", "package.json"]) {
    const res = analyzeWith([file]);
    assert.deepEqual([...res.selection].sort(), [...ALL_RUNNABLE].sort(), file);
    assert.equal(res.evaluateAll, true, file);
  }
});

it("selects a workspace-specific eslint config change and its dependents", () => {
  const res = analyzeWith(["apps/boilerplate-api/eslint.config.mjs"]);
  assert.deepEqual([...res.selection].sort(), [
    "apps/boilerplate-api",
    "apps/boilerplate-application",
    "apps/boilerplate-docs"
  ]);
});

it("flags validation-machinery changes as an applicable machinery self-test", () => {
  for (const file of [
    "scripts/pr-validation/detect.mjs",
    "scripts/pr-validation/detect.test.mjs",
    "scripts/pr-validation/gate.mjs",
    ".github/workflows/pr-validation.yml"
  ]) {
    const res = analyzeWith([file]);
    assert.deepEqual(res.selection, [], file);
    assert.equal(res.machinery, true, file);
    assert.equal(res.formattingOnly, false, file);
  }
});

it("combines machinery and workspace changes in one diff", () => {
  const res = analyzeWith([
    "apps/boilerplate-website/src/pages/index.astro",
    "scripts/pr-validation/analysis.mjs"
  ]);
  assert.deepEqual(res.selection, ["apps/boilerplate-website"]);
  assert.equal(res.machinery, true);
});

it("machinery stays an applicable check alongside global tooling changes", () => {
  const res = analyzeWith(["turbo.json", ".github/workflows/pr-validation.yml"]);
  assert.deepEqual([...res.selection].sort(), [...ALL_RUNNABLE].sort());
  assert.equal(res.evaluateAll, true);
  assert.equal(res.machinery, true);
});

it("runs no application checks for internal README/docs-only changes", () => {
  for (const file of [
    "README.md",
    "docs/context.md",
    ".github/workflows/release.yml",
    "apps/boilerplate-website/README.md",
    "packages/harness/templates/default/docs/engineering/tdd.md"
  ]) {
    const res = analyzeWith([file]);
    assert.deepEqual(res.selection, [], file);
    assert.equal(res.evaluateAll, false, file);
    assert.equal(res.formattingOnly, true, file);
  }
});

it("builds the documentation app when its content changes", () => {
  const res = analyzeWith(["apps/documentation/src/content/docs/index.mdx"]);
  assert.deepEqual(res.selection, ["apps/documentation"]);
  assert.equal(res.formattingOnly, false);
});

it("builds the boilerplate docs app when its content changes", () => {
  const res = analyzeWith(["apps/boilerplate-docs/src/content/partials/example.mdx"]);
  assert.deepEqual(res.selection, ["apps/boilerplate-docs"]);
});

it("treats template/runtime markdown inputs inside a runnable workspace as app changes", () => {
  const res = analyzeWith(["packages/cli/templates/setup.md"]);
  assert.deepEqual(res.selection, ["packages/cli"]);
});

it("marks unattributable lockfile changes for every runnable workspace", () => {
  const diff = libraryDiff([
    "@@ -2400,4 +2400,5 @@ packages:",
    "   some-package@1.0.0:",
    '+    engines: { node: ">=18" }'
  ]);
  const res = analyzeWith(["pnpm-lock.yaml"], { lockfileDiff: diff });
  assert.deepEqual([...res.selection].sort(), [...ALL_RUNNABLE].sort());
  assert.equal(res.evaluateAll, true);
  assert.equal(res.lockfileAmbiguous, true);
});

it("narrowed lockfile selection when diff hunks have importer context", () => {
  const diff = libraryDiff([
    "@@ -143,7 +143,9 @@",
    "   apps/boilerplate-docs:",
    "     dependencies:",
    "+      some-package: 5.1.0"
  ]);
  const res = analyzeWith(["pnpm-lock.yaml"], { lockfileDiff: diff });
  assert.deepEqual([...res.selection].sort(), ["apps/boilerplate-docs"]);
  assert.equal(res.evaluateAll, false);
});

it("falls back to all runnable workspaces when hunks lack importer attribution", () => {
  const diff = libraryDiff(["@@ -100,2 +100,3 @@", '+    engines: { node: ">=18" }']);
  const res = analyzeWith(["pnpm-lock.yaml"], { lockfileDiff: diff });
  assert.equal(res.evaluateAll, true);
});

it("combines a manifest change with lockfile attribution", () => {
  const diff = libraryDiff([
    "@@ -2000,4 +2000,6 @@",
    "   apps/boilerplate-api:",
    "+    dependencies:",
    "+      some-new-pkg: 1.0.0"
  ]);
  const res = analyzeWith(["packages/cli/package.json", "pnpm-lock.yaml"], { lockfileDiff: diff });
  assert.deepEqual([...res.selection].sort(), ["apps/boilerplate-api", "packages/cli"]);
});

it("falls back to all runnable workspaces when an ambiguous lockfile accompanies a manifest change", () => {
  const diff = libraryDiff(["@@ -100,2 +100,3 @@", '+    engines: { node: ">=18" }']);
  const res = analyzeWith(["apps/boilerplate-api/package.json", "pnpm-lock.yaml"], {
    lockfileDiff: diff
  });
  assert.deepEqual([...res.selection].sort(), [...ALL_RUNNABLE].sort());
  assert.equal(res.evaluateAll, true);
});

it("adds an entirely new importer workspace from a lockfile diff", () => {
  const diff = libraryDiff([
    "@@ -1,3 +1,10 @@ importers:",
    "+  apps/boilerplate-website:",
    "+    dependencies:",
    "+      some-package: 1.0.0"
  ]);
  const res = analyzeWith(["packages/cli/src/index.ts", "pnpm-lock.yaml"], { lockfileDiff: diff });
  assert.deepEqual([...res.selection].sort(), ["apps/boilerplate-website", "packages/cli"]);
});

describe("computeTransitiveDependents", () => {
  it("closes over a diamond dependency graph", () => {
    const dependentsByName = new Map([
      ["top", new Set(["left", "right"])],
      ["left", new Set(["base"])],
      ["right", new Set(["base"])]
    ]);
    const out = computeTransitiveDependents(new Set(["top"]), dependentsByName);
    assert.deepEqual([...out].sort(), ["base", "left", "right"]);
  });

  it("does not loop forever on cyclic graphs", () => {
    const dependentsByName = new Map([
      ["a", new Set(["b"])],
      ["b", new Set(["a"])]
    ]);
    const out = computeTransitiveDependents(new Set(["b"]), dependentsByName);
    assert.deepEqual([...out].sort(), ["a"]);
  });
});
