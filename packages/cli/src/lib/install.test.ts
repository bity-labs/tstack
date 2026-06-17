import { describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

vi.mock("node:child_process", () => ({
  execSync: vi.fn(),
}));

import { execSync } from "node:child_process";
import { installDependencies } from "./install.js";

function makeTempDir(prefix: string): string {
  return mkdtempSync(join(tmpdir(), prefix));
}

describe("installDependencies", () => {
  it("runs pnpm install in the target directory", () => {
    const targetDir = makeTempDir("tstack-install-");

    try {
      installDependencies(targetDir);

      expect(execSync).toHaveBeenCalledWith("pnpm install", { cwd: targetDir, stdio: "inherit" });
    } finally {
      rmSync(targetDir, { recursive: true, force: true });
    }
  });

  it("throws a clear error when pnpm install fails", () => {
    const targetDir = makeTempDir("tstack-install-");

    try {
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error("command failed");
      });

      expect(() => installDependencies(targetDir)).toThrow("Failed to install dependencies");
    } finally {
      if (existsSync(targetDir)) rmSync(targetDir, { recursive: true, force: true });
    }
  });
});
