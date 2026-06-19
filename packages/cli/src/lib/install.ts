import { execSync } from "node:child_process";

export function installDependencies(targetDir: string): void {
  try {
    execSync("pnpm install", { cwd: targetDir, stdio: "inherit" });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to install dependencies: ${message}`);
  }
}
