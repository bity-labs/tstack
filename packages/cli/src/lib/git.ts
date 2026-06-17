import { execSync } from "node:child_process";
import { rmSync, existsSync } from "node:fs";

export function setupGit(targetDir: string): void {
  try {
    const gitDir = `${targetDir}/.git`;
    if (existsSync(gitDir)) {
      rmSync(gitDir, { recursive: true, force: true });
    }

    execSync("git init", { cwd: targetDir, stdio: "ignore" });
    execSync("git add .", { cwd: targetDir, stdio: "ignore" });
    execSync('git commit -m "Initial commit from TStack"', { cwd: targetDir, stdio: "ignore" });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to initialize git repository: ${message}`);
  }
}
