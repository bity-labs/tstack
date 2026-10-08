import { computeTransitiveDependents } from "./graph.mjs";

/** Files whose change drives validation of every runnable workspace. */
export const GLOBAL_TOOLING_FILES = [
  "package.json",
  "turbo.json",
  "pnpm-workspace.yaml",
  ".prettierrc.json",
  ".prettierignore"
];

/** Documentation-app content consumed by Astro builds at these prefixes. */
const DOC_CONTENT_PREFIXES = [
  "apps/documentation/src/content/",
  "apps/boilerplate-docs/src/content/"
];

const MARKDOWN_RE = /\.(md|mdx)$/;

/** Internal repository documentation basenames: formatting-only when changed on their own. */
const INTERNAL_DOC_BASENAMES = new Set([
  "readme.md",
  "agent.md",
  "agents.md",
  "claude.md",
  "changelog.md",
  "contributing.md",
  "license.md",
  "security.md"
]);

/**
 * Markdown inside a runnable workspace normally serves build/runtime/template
 * tooling (CLI templates, docs-app content) and is treated by its consumer;
 * only widely-recognised internal documentation basenames and docs/ folders
 * are formatting-only.
 */
function isInternalDocFile(path) {
  const segments = path.split("/");
  if (segments.slice(0, -1).includes("docs")) return true;
  return INTERNAL_DOC_BASENAMES.has(segments[segments.length - 1].toLowerCase());
}

function workspaceOf(path) {
  const match = path.match(/^(apps|packages)\/[^/]+\//);
  return match ? path.slice(0, match[0].length - 1) : undefined;
}

/**
 * Attribution of a pnpm-lock.yaml unified diff to importer (workspace) blocks.
 *
 * Changed lines are attributed to the nearest preceding importer header at
 * two-space indentation inside their hunk. Hunks that carry changed lines
 * without such a header (root importer renames, package-snapshot-only hunks)
 * make attribution ambiguous and force validation of every workspace.
 */
function attributeLockfileDiff(lockfileDiff) {
  const attributed = new Set();
  let ambiguous = false;
  let currentImporter;
  for (const line of lockfileDiff.split("\n")) {
    if (/^(diff |index |--- |\+\+\+ )/.test(line)) continue;
    const marker = line[0];
    const body =
      marker === "+" || marker === "-" ? line.slice(1) : marker === " " ? line.slice(1) : line;
    if (marker === "@") {
      // New hunk: attribution resets because the importer context may be lost.
      currentImporter = undefined;
      continue;
    }
    if (marker !== "+" && marker !== "-" && marker !== " ") continue;
    const importerHeader = body.match(/^  (apps|packages)\/([^:]+):\s*$/);
    if (importerHeader) {
      currentImporter = `${importerHeader[1]}/${importerHeader[2]}`;
      continue;
    }
    if (marker !== " " && currentImporter) attributed.add(currentImporter);
    if (marker !== " " && !currentImporter) ambiguous = true;
  }
  return { attributed, ambiguous };
}

/**
 * Computes the PR validation workspace selection from changed files against a
 * PR target branch.
 *
 * Returns:
 * - `selection`: runnable workspaces that must run lint/typecheck/test/build.
 * - `evaluateAll`: true when selection degraded to all runnable workspaces
 *   (global tooling change or ambiguous lockfile change).
 * - `formattingOnly`: true when no application checks apply.
 * - `lockfileAmbiguous`: true when a lockfile change could not be attributed.
 */
export function analyze({ changedFiles, lockfileDiff, graph, allRunnable }) {
  const { dependentsByName } = graph;
  const seeds = new Set();
  const lockfileSeeds = new Set();
  let globalChange = false;
  let lockfileChange = false;
  for (const path of changedFiles) {
    if (path === "pnpm-lock.yaml") {
      lockfileChange = true;
      continue;
    }
    if (GLOBAL_TOOLING_FILES.includes(path)) {
      globalChange = true;
      continue;
    }
    const workspace = workspaceOf(path);
    if (!workspace) continue; // repository-level markdown, .github, docs/ — formatting only
    const isDocContent = DOC_CONTENT_PREFIXES.some((prefix) => path.startsWith(prefix));
    if (isDocContent) {
      seeds.add(workspace);
      continue;
    }
    if (MARKDOWN_RE.test(path) && isInternalDocFile(path)) continue; // internal README/docs-only
    seeds.add(workspace);
  }

  if (globalChange) {
    return {
      selection: [...allRunnable],
      evaluateAll: true,
      formattingOnly: false,
      lockfileAmbiguous: false
    };
  }

  if (lockfileChange) {
    if (lockfileDiff === undefined) {
      // Missing lockfile diff input: cannot attribute reliably.
      return {
        selection: [...allRunnable],
        evaluateAll: true,
        formattingOnly: false,
        lockfileAmbiguous: true
      };
    }
    const { attributed, ambiguous } = attributeLockfileDiff(lockfileDiff);
    if (ambiguous) {
      return {
        selection: [...allRunnable],
        evaluateAll: true,
        formattingOnly: false,
        lockfileAmbiguous: true
      };
    }
    for (const importer of attributed) lockfileSeeds.add(importer);
  }

  // Expand path-driven seeds to transitive dependents (workspace paths →
  // consumer workspace paths). Lockfile-attributed importers are added as
  // selected workspaces without dependent expansion: their importer blocks
  // describe that workspace's own dependency resolution.
  const closure = computeTransitiveDependents(new Set(seeds), dependentsByName);
  const selection = new Set();
  for (const workspace of [...seeds, ...closure, ...lockfileSeeds]) {
    if (allRunnable.includes(workspace)) selection.add(workspace);
  }

  if (selection.size === 0) {
    return {
      selection: [],
      evaluateAll: false,
      formattingOnly: true,
      lockfileAmbiguous: false
    };
  }
  return {
    selection: [...selection].sort(),
    evaluateAll: false,
    formattingOnly: false,
    lockfileAmbiguous: false
  };
}
