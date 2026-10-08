#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { loadWorkspaceGraph } from "./graph.mjs";
import { analyze } from "./analysis.mjs";

const USAGE = `Detect the affected workspace selection for a pull request.

Usage: node detect.mjs --base <ref> [--head <ref>] [--diff <path>]

- <ref> names a commit or branch inside the checked-out repository.
- Paths in the output are workspace directories relative to the repository root.
- Prints one JSON document: { selection, evaluateAll, formattingOnly, lockfileAmbiguous }.`;

function git(repoRoot, ...args) {
  return execFileSync("git", ["-C", repoRoot, ...args], { encoding: "utf8" }).trim();
}

const WORKSPACE_TASKS = ["lint", "typecheck", "test", "build"];

function workspaceTasks(repoRoot, workspacePath) {
  try {
    const scripts = JSON.parse(
      readFileSync(`${repoRoot}/${workspacePath}/package.json`, "utf8")
    ).scripts;
    return WORKSPACE_TASKS.filter((task) => Boolean(scripts?.[task]));
  } catch {
    return [];
  }
}

function run({ repoRoot, baseRef, headRef = "HEAD" }) {
  const changedFiles = git(repoRoot, "diff", "--name-only", `${baseRef}...${headRef}`)
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const lockfileDiff = git(repoRoot, "diff", `${baseRef}...${headRef}`, "--", "pnpm-lock.yaml");
  const graph = loadWorkspaceGraph(repoRoot);
  const runnable = [...graph.names.keys()].filter(
    (workspacePath) => workspaceTasks(repoRoot, workspacePath).length > 0
  );
  const result = analyze({ changedFiles, lockfileDiff, graph, allRunnable: runnable });
  return {
    ...result,
    selection_matrix: result.selection.map((workspace) => ({
      workspace,
      pkg: graph.names.get(workspace) ?? workspace,
      tasks: workspaceTasks(repoRoot, workspace).join(" "),
      slug: workspace.replaceAll("/", "_")
    }))
  };
}

export { run, USAGE };

if (process.argv[1] && process.argv[1].endsWith("detect.mjs")) {
  const argv = process.argv.slice(2);
  const readOption = (name) => {
    const index = argv.indexOf(name);
    if (index === -1) return undefined;
    return argv[index + 1];
  };
  const baseRef = readOption("--base");
  const headRef = readOption("--head") ?? "HEAD";
  if (!baseRef) {
    console.error(USAGE);
    process.exit(2);
  }
  try {
    const result = run({ repoRoot: process.cwd(), baseRef, headRef });
    console.log(JSON.stringify(result));
  } catch (error) {
    console.error(`PR validation detection failed: ${error.message}`);
    process.exit(1);
  }
}
