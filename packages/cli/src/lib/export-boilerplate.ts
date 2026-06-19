import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const excludedDirectories = new Set([
  ".git",
  ".next",
  ".turbo",
  "node_modules",
  ".velite",
  ".vercel",
  ".worktrees",
  "src/generated/prisma",
]);

const excludedFiles = new Set([
  ".env",
  ".env.local",
  "tsconfig.tsbuildinfo",
  ".DS_Store",
  "sqlite.db",
  "IMPLEMENTATION_PLAN.md",
  "next-env.d.ts",
]);

const excludedExtensions = new Set([".db", ".pem", ".tsbuildinfo"]);
const excludedPatterns = [/^npm-debug\.log/, /^yarn-debug\.log/, /^yarn-error\.log/, /^\.pnpm-debug\.log/];

function isExcluded(entryName: string, relativePath: string): boolean {
  if (excludedDirectories.has(relativePath) || excludedDirectories.has(entryName)) {
    return true;
  }

  if (excludedFiles.has(entryName)) {
    return true;
  }

  const ext = entryName.slice(entryName.lastIndexOf("."));
  if (excludedExtensions.has(ext)) {
    return true;
  }

  if (excludedPatterns.some((pattern) => pattern.test(entryName))) {
    return true;
  }

  return false;
}

export function exportBoilerplate(options: {
  sourceDir: string;
  targetDir: string;
}): void {
  const { sourceDir, targetDir } = options;

  if (existsSync(targetDir)) {
    throw new Error(`Target directory already exists: ${targetDir}`);
  }

  copyDirectory(sourceDir, targetDir, "");
}

function copyDirectory(source: string, target: string, relativePath: string): void {
  mkdirSync(target, { recursive: true });

  for (const entry of readdirSync(source, { withFileTypes: true })) {
    const entryRelativePath = relativePath ? `${relativePath}/${entry.name}` : entry.name;

    if (isExcluded(entry.name, entryRelativePath)) {
      continue;
    }

    const sourcePath = join(source, entry.name);
    const targetPath = join(target, entry.name);

    if (entry.isSymbolicLink()) {
      const linkTarget = statSync(sourcePath);
      if (linkTarget.isDirectory()) {
        copyDirectory(sourcePath, targetPath, entryRelativePath);
      } else {
        writeFileSync(targetPath, readFileSync(sourcePath));
      }
    } else if (entry.isDirectory()) {
      copyDirectory(sourcePath, targetPath, entryRelativePath);
    } else {
      writeFileSync(targetPath, readFileSync(sourcePath));
    }
  }
}
