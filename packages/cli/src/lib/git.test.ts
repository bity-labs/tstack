import { describe, expect, it, vi } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

vi.mock("node:child_process", () => ({
  execSync: vi.fn(),
}));

import { execSync } from "node:child_process";
import { setupGit } from "./git.js";

function makeTempDir(prefix: string): string {
  return mkdtempSync(join(tmpdir(), prefix));
}

describe("setupGit", () => {
  it("initializes a git repository with a TStack initial commit message", () => {
    const targetDir = makeTempDir("tstack-git-");

    try {
      setupGit(targetDir);

      expect(execSync).toHaveBeenCalledWith("git init", { cwd: targetDir, stdio: "ignore" });
      expect(execSync).toHaveBeenCalledWith("git add .", { cwd: targetDir, stdio: "ignore" });
      expect(execSync).toHaveBeenCalledWith(
        'git commit -m "Initial commit from TStack"',
        { cwd: targetDir, stdio: "ignore" },
      );
    } finally {
      rmSync(targetDir, { recursive: true, force: true });
    }
  });

  it("removes an existing .git directory before initializing", () => {
    const targetDir = makeTempDir("tstack-git-");
    const gitDir = join(targetDir, ".git");

    try {
      mkdirSync(gitDir, { recursive: true });
      writeFileSync(join(gitDir, "config"), "existing");

      setupGit(targetDir);

      expect(execSync).toHaveBeenCalledWith("git init", { cwd: targetDir, stdio: "ignore" });
    } finally {
      if (existsSync(targetDir)) rmSync(targetDir, { recursive: true, force: true });
    }
  });

  it("throws a clear error when git command fails", () => {
    const targetDir = makeTempDir("tstack-git-");

    try {
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error("git not found");
      });

      expect(() => setupGit(targetDir)).toThrow("Failed to initialize git repository");
    } finally {
      if (existsSync(targetDir)) rmSync(targetDir, { recursive: true, force: true });
    }
  });
});
