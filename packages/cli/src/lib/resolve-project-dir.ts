import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

function findTstackRepoRoot(): string | undefined {
  let dir = dirname(fileURLToPath(import.meta.url));
  while (dir !== dirname(dir)) {
    if (
      existsSync(join(dir, "turbo.json")) &&
      existsSync(join(dir, "pnpm-workspace.yaml"))
    ) {
      return dir;
    }
    dir = dirname(dir);
  }
  return undefined;
}

export function resolveProjectDir(projectDir: string): string {
  // Absolute path — use as-is
  if (projectDir.startsWith("/")) {
    return projectDir;
  }

  // Explicit relative path — resolve against cwd
  if (projectDir.startsWith("./") || projectDir.startsWith("../")) {
    return resolve(process.cwd(), projectDir);
  }

  // Bare name — if we're inside the tstack repo, place as sibling to the repo
  const repoRoot = findTstackRepoRoot();
  if (repoRoot) {
    const cwd = process.cwd();
    if (cwd === repoRoot || cwd.startsWith(repoRoot + "/")) {
      return resolve(repoRoot, "..", projectDir);
    }
  }

  // Default: resolve against cwd
  return resolve(process.cwd(), projectDir);
}
