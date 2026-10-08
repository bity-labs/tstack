import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Loads workspace package-name and reverse-dependency information from the
 * pnpm/Turbo workspace at {@link repoRoot}.
 *
 * Returns `{ names, dependentsByName }`:
 * - `names`: Map<workspacePath, packageName> for every workspace under apps/ and packages/ that has a package.json.
 * - `dependentsByName`: Map<dependencyWorkspacePath, Set<consumerWorkspacePath>>
 *   listing workspaces whose package.json references another workspace
 *   package through the workspace protocol.
 */
export function loadWorkspaceGraph(repoRoot) {
  const names = new Map();
  const nameToPath = new Map();
  const dependentsByName = new Map();
  const workspacesRoot = (workspaceDir) => {
    try {
      return readdirSync(join(repoRoot, workspaceDir), { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => `${workspaceDir}/${entry.name}`);
    } catch {
      return [];
    }
  };
  const workspacePaths = [...workspacesRoot("apps"), ...workspacesRoot("packages")];
  for (const workspacePath of workspacePaths) {
    const manifestPath = join(repoRoot, workspacePath, "package.json");
    if (!existsSync(manifestPath)) continue;
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    if (manifest.name) {
      names.set(workspacePath, manifest.name);
      if (!nameToPath.has(manifest.name)) nameToPath.set(manifest.name, new Set());
      nameToPath.get(manifest.name).add(workspacePath);
    }
  }
  for (const workspacePath of workspacePaths) {
    // README-only placeholders have no package.json and carry no dependencies.
    if (!existsSync(join(repoRoot, workspacePath, "package.json"))) continue;
    const manifest = JSON.parse(
      readFileSync(join(repoRoot, workspacePath, "package.json"), "utf8")
    );
    const dependencySections = ["dependencies", "devDependencies", "optionalDependencies"];
    for (const section of dependencySections) {
      for (const [depName, depRange] of Object.entries(manifest[section] ?? {})) {
        if (!String(depRange).startsWith("workspace:")) continue;
        for (const depPath of nameToPath.get(depName) ?? []) {
          if (!dependentsByName.has(depPath)) dependentsByName.set(depPath, new Set());
          dependentsByName.get(depPath).add(workspacePath);
        }
      }
    }
  }
  return { names, dependentsByName };
}

/**
 * Expands {@link seedNames} to the transitive set of dependents via
 * {@link dependentsByName}, a Map<node, Set<dependents>>. Cycles are
 * handled; the returned set excludes the seeds themselves unless a cycle pulls
 * them back in.
 */
export function computeTransitiveDependents(seedNames, dependentsByName) {
  const result = new Set();
  const queue = [...seedNames];
  while (queue.length > 0) {
    const current = queue.shift();
    if (result.has(current)) continue;
    result.add(current);
    for (const dependent of dependentsByName.get(current) ?? []) queue.push(dependent);
  }
  for (const seed of seedNames) if (!dependentsByName.get(seed)?.has(seed)) result.delete(seed);
  return result;
}
