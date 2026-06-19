import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync, readFileSync, existsSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { exportBoilerplate } from "./export-boilerplate.js";

function makeTempDir(prefix: string): string {
  return mkdtempSync(join(tmpdir(), prefix));
}

describe("exportBoilerplate", () => {
  it("throws a clear error when the target directory already exists", () => {
    const targetDir = makeTempDir("tstack-export-target-");

    try {
      expect(() =>
        exportBoilerplate({
          sourceDir: "/nonexistent/source",
          targetDir,
        }),
      ).toThrow("Target directory already exists");
    } finally {
      rmSync(targetDir, { recursive: true, force: true });
    }
  });

  it("copies regular files from source to target", () => {
    const sourceDir = makeTempDir("tstack-export-source-");
    const targetDir = join(sourceDir, "../tstack-export-target-" + Date.now());

    try {
      writeFileSync(join(sourceDir, "README.md"), "# Hello");
      mkdirSync(join(sourceDir, "src"));
      writeFileSync(join(sourceDir, "src", "index.ts"), "export {}");

      exportBoilerplate({ sourceDir, targetDir });

      expect(readFileSync(join(targetDir, "README.md"), "utf8")).toBe("# Hello");
      expect(readFileSync(join(targetDir, "src", "index.ts"), "utf8")).toBe("export {}");
    } finally {
      rmSync(sourceDir, { recursive: true, force: true });
      if (existsSync(targetDir)) rmSync(targetDir, { recursive: true, force: true });
    }
  });

  it("excludes local and generated junk directories and files", () => {
    const sourceDir = makeTempDir("tstack-export-source-");
    const targetDir = join(sourceDir, "../tstack-export-target-" + Date.now());

    try {
      writeFileSync(join(sourceDir, "keep.txt"), "keep");
      mkdirSync(join(sourceDir, ".git"));
      writeFileSync(join(sourceDir, ".git", "config"), "git");
      mkdirSync(join(sourceDir, "node_modules"));
      writeFileSync(join(sourceDir, "node_modules", "pkg.js"), "pkg");
      mkdirSync(join(sourceDir, ".next"));
      writeFileSync(join(sourceDir, ".next", "build.json"), "{}");
      mkdirSync(join(sourceDir, ".turbo"));
      writeFileSync(join(sourceDir, ".turbo", "cache"), "cache");
      writeFileSync(join(sourceDir, ".env"), "SECRET=1");
      writeFileSync(join(sourceDir, "tsconfig.tsbuildinfo"), "info");
      writeFileSync(join(sourceDir, ".env.local"), "LOCAL=1");
      mkdirSync(join(sourceDir, ".velite"));
      writeFileSync(join(sourceDir, ".velite", "out.json"), "{}");

      exportBoilerplate({ sourceDir, targetDir });

      expect(existsSync(join(targetDir, "keep.txt"))).toBe(true);
      expect(existsSync(join(targetDir, ".git"))).toBe(false);
      expect(existsSync(join(targetDir, "node_modules"))).toBe(false);
      expect(existsSync(join(targetDir, ".next"))).toBe(false);
      expect(existsSync(join(targetDir, ".turbo"))).toBe(false);
      expect(existsSync(join(targetDir, ".env"))).toBe(false);
      expect(existsSync(join(targetDir, "tsconfig.tsbuildinfo"))).toBe(false);
      expect(existsSync(join(targetDir, ".env.local"))).toBe(false);
      expect(existsSync(join(targetDir, ".velite"))).toBe(false);
    } finally {
      rmSync(sourceDir, { recursive: true, force: true });
      if (existsSync(targetDir)) rmSync(targetDir, { recursive: true, force: true });
    }
  });

  it("materializes symlinked directories as real copied directories", () => {
    const realDir = makeTempDir("tstack-export-real-");
    const sourceDir = makeTempDir("tstack-export-source-");
    const targetDir = join(sourceDir, "../tstack-export-target-" + Date.now());

    try {
      writeFileSync(join(realDir, "skill.md"), "# Skill");
      mkdirSync(join(sourceDir, "docs"));
      symlinkSync(realDir, join(sourceDir, "docs", "engineering"), "dir");
      symlinkSync(realDir, join(sourceDir, ".agents"), "dir");

      exportBoilerplate({ sourceDir, targetDir });

      const engineeringDir = join(targetDir, "docs", "engineering");
      const agentsDir = join(targetDir, ".agents");

      expect(existsSync(engineeringDir)).toBe(true);
      expect(existsSync(join(engineeringDir, "skill.md"))).toBe(true);
      expect(readFileSync(join(engineeringDir, "skill.md"), "utf8")).toBe("# Skill");

      expect(existsSync(agentsDir)).toBe(true);
      expect(existsSync(join(agentsDir, "skill.md"))).toBe(true);
      expect(readFileSync(join(agentsDir, "skill.md"), "utf8")).toBe("# Skill");

      const engineeringStat = statSync(engineeringDir);
      expect(engineeringStat.isSymbolicLink()).toBe(false);

      const agentsStat = statSync(agentsDir);
      expect(agentsStat.isSymbolicLink()).toBe(false);
    } finally {
      rmSync(realDir, { recursive: true, force: true });
      rmSync(sourceDir, { recursive: true, force: true });
      if (existsSync(targetDir)) rmSync(targetDir, { recursive: true, force: true });
    }
  });

  it("materializes symlinked files as real copied files", () => {
    const sourceDir = makeTempDir("tstack-export-source-");
    const targetDir = join(sourceDir, "../tstack-export-target-" + Date.now());

    try {
      writeFileSync(join(sourceDir, "original.txt"), "original");
      symlinkSync(join(sourceDir, "original.txt"), join(sourceDir, "link.txt"), "file");

      exportBoilerplate({ sourceDir, targetDir });

      expect(existsSync(join(targetDir, "link.txt"))).toBe(true);
      expect(readFileSync(join(targetDir, "link.txt"), "utf8")).toBe("original");
      expect(statSync(join(targetDir, "link.txt")).isSymbolicLink()).toBe(false);
    } finally {
      rmSync(sourceDir, { recursive: true, force: true });
      if (existsSync(targetDir)) rmSync(targetDir, { recursive: true, force: true });
    }
  });
});
