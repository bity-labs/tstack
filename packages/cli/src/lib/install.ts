import { execSync } from "node:child_process";

export function installDependencies(targetDir: string): void {
  try {
    execSync("pnpm install", { cwd: targetDir, stdio: "inherit" });
  } catch {
    throw new Error("Failed to install dependencies");
  }
}
