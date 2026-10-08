import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadWorkspaceGraph } from "./graph.mjs";

/**
 * Test fixture: a temporary directory laid out like the v2 workspace with the
 * manifests given {@link workspaceManifests}. Used for workspace-graph tests.
 */
export function createWorkspaceFixture(workspaceManifests = {}) {
  const root = mkdtempSync(join(tmpdir(), "tstack-pr-validation-"));
  const dirs = [];
  for (const [workspacePath, manifest] of Object.entries(workspaceManifests)) {
    const dir = join(root, workspacePath);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "package.json"), JSON.stringify(manifest, null, 2) + "\n");
    dirs.push(workspacePath);
  }
  let graphCache;
  return {
    root,
    cleanup: () => rmSync(root, { recursive: true, force: true }),
    graph() {
      if (!graphCache) graphCache = loadWorkspaceGraph(root);
      return graphCache;
    },
    writeWorkspaceManifest(workspacePath, manifest) {
      const dir = join(root, workspacePath);
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, "package.json"), JSON.stringify(manifest, null, 2) + "\n");
      graphCache = undefined;
    }
  };
}
