import { it, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { run as detectRun } from "./detect.mjs";

let repo;

beforeEach(() => {
  repo = new GitFixture();
});

afterEach(() => repo.dispose());

const RUNNABLE = [
  "apps/boilerplate-api",
  "apps/boilerplate-application",
  "apps/boilerplate-docs",
  "apps/boilerplate-mobile-application",
  "apps/boilerplate-website",
  "apps/documentation",
  "packages/cli"
];

function detectFn(base, head) {
  return detectRun({ repoRoot: repo.root, baseRef: base, headRef: head ?? "HEAD" });
}

class GitFixture {
  constructor() {
    this.root = mkdtempSync(join(tmpdir(), "tstack-detect-"));
    this.scriptsDir = import.meta.dirname;
    this.git("init", "-qb", "main");
    this.git("config", "user.email", "ci@example.com");
    this.git("config", "user.name", "Fixture");
    for (const workspace of RUNNABLE) {
      mkdirSync(join(this.root, workspace), { recursive: true });
      writeFileSync(
        join(this.root, workspace, "package.json"),
        JSON.stringify(
          {
            name: `@tstack/${workspace.split("/").pop()}`,
            scripts: { lint: ".", test: ".", build: ".", typecheck: "." }
          },
          null,
          2
        )
      );
    }
    this.commitFile(".gitignore", "node_modules/\n", "fixture ignore rules");
    this.commitFile("apps/boilerplate-website/src/pages/index.astro", "welcome", "baseline");
  }

  at(name) {
    return join(this.root, name);
  }

  git(...args) {
    return execFileSync("git", ["-C", this.root, ...args], { encoding: "utf8" });
  }

  commitFile(path, content, message) {
    mkdirSync(join(this.at(path), ".."), { recursive: true });
    writeFileSync(this.at(path), content);
    this.git("add", ".");
    this.git("commit", "-qm", message);
    return this.git("rev-parse", "HEAD").trim();
  }

  checkoutNewBranch(name) {
    this.git("checkout", "-qb", name);
    return name;
  }

  /** Replaces the first line containing {@link needle}, then commits. */
  replaceLine(path, needle, replacement, message) {
    const lines = readFileSync(this.at(path), "utf8").split("\n");
    const index = lines.findIndex((line) => line.includes(needle));
    assert.ok(index !== -1, `no line in ${path} matched ${needle}`);
    lines[index] = lines[index].replace(needle, replacement);
    writeFileSync(this.at(path), lines.join("\n"));
    this.git("add", ".");
    this.git("commit", "-qm", message);
  }

  dispose() {
    rmSync(this.root, { recursive: true, force: true });
  }
}

it("detects a website-only change and no unrelated workspace", () => {
  repo.checkoutNewBranch("topic");
  repo.commitFile("apps/boilerplate-website/src/pages/index.astro", "welcome2", "website change");
  const result = detectFn("main");
  assert.deepEqual(result.selection, ["apps/boilerplate-website"]);
  assert.equal(result.formattingOnly, false);
  assert.equal(result.evaluateAll, false);
});

it("detects no runnable check for a docs-only change", () => {
  repo.checkoutNewBranch("topic");
  repo.commitFile("docs/notes.md", "notes", "docs update");
  const result = detectFn("main");
  assert.deepEqual(result.selection, []);
  assert.equal(result.formattingOnly, true);
  assert.equal(result.evaluateAll, false);
});

it("validates every runnable workspace for an ambiguous lockfile diff", () => {
  repo.checkoutNewBranch("topic");
  repo.commitFile(
    "pnpm-lock.yaml",
    "packages:\n  some-package@1.0.0:\n    version: 1.0.0\n",
    "lockfile baseline"
  );
  repo.commitFile(
    "pnpm-lock.yaml",
    "packages:\n  some-package@1.0.0:\n    version: 1.0.1\n",
    "lockfile bump in package snapshots"
  );
  const result = detectFn("main");
  assert.deepEqual([...result.selection].sort(), [...RUNNABLE].sort());
  assert.equal(result.evaluateAll, true);
  assert.equal(result.lockfileAmbiguous, true);
});

it("narrowed selection when lockfile diff hunks carry importer context lines", () => {
  repo.commitFile(
    "pnpm-lock.yaml",
    "importers:\n  apps/boilerplate-docs:\n    dependencies:\n      some-pkg@1.0.0: 1.0.0\n",
    "lockfile importers baseline"
  );
  repo.checkoutNewBranch("topic");
  repo.replaceLine(
    "pnpm-lock.yaml",
    "some-pkg@1.0.0: 1.0.0",
    "some-pkg@1.0.0: 1.0.1",
    "bump for the docs importer"
  );
  const result = detectFn("main");
  assert.deepEqual(result.selection, ["apps/boilerplate-docs"]);
  assert.equal(result.evaluateAll, false);
});

it("exposes a workspace selection matrix with available tasks", () => {
  repo.checkoutNewBranch("topic");
  repo.commitFile(
    "apps/boilerplate-website/src/pages/index.astro",
    "welcome-matrix",
    "topic change"
  );
  const result = detectRun({ repoRoot: repo.root, baseRef: "main", headRef: "topic" });
  const [website] = result.selection_matrix;
  assert.deepEqual(website.workspace, "apps/boilerplate-website");
  assert.equal(website.tasks, "lint typecheck test build");
  assert.equal(website.slug, "apps_boilerplate-website");
  assert.equal(website.pkg, "@tstack/boilerplate-website");
});

it("validates the topic branch against the actual target branch head", () => {
  repo.checkoutNewBranch("topic");
  repo.commitFile("apps/boilerplate-website/src/pages/index.astro", "welcome3", "topic change");
  const result = detectRun({ repoRoot: repo.root, baseRef: "main", headRef: "topic" });
  assert.deepEqual(result.selection, ["apps/boilerplate-website"]);
});

it("flags machinery changes as an applicable validation of the machinery itself", () => {
  repo.commitFile("scripts/pr-validation/detect.mjs", "baseline", "machinery baseline on main");
  repo.checkoutNewBranch("topic");
  repo.commitFile("scripts/pr-validation/analysis.mjs", "changed", "machinery change on topic");
  const result = detectFn("main");
  assert.deepEqual(result.selection, []);
  assert.equal(result.formattingOnly, false);
  assert.equal(result.machinery, true);
  assert.equal(result.evaluateAll, false);
});

it("fails loudly when the base ref is unknown", () => {
  repo.checkoutNewBranch("topic");
  repo.commitFile("README.md", "readme", "commit a readme");
  assert.throws(() => detectFn("nonexistent-base"));
});

it("exposes detect CLI --base/--head arguments and JSON output", () => {
  repo.checkoutNewBranch("topic");
  repo.commitFile("apps/boilerplate-website/src/pages/index.astro", "welcome4", "topic change");
  const stdout = execFileSync(
    "node",
    [join(import.meta.dirname, "detect.mjs"), "--base", "main", "--head", "topic"],
    { cwd: repo.root, encoding: "utf8" }
  );
  const parsed = JSON.parse(stdout);
  assert.deepEqual(parsed.selection, ["apps/boilerplate-website"]);
});
