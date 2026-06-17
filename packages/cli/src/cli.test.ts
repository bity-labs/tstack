import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

vi.mock("node:child_process", () => ({
  execSync: vi.fn(),
}));

import { runCli } from "./cli.js";

function makeTempDir(prefix: string): string {
  return mkdtempSync(join(tmpdir(), prefix));
}

describe("runCli", () => {
  it("prints repo-run help with the supported TStack commands", () => {
    const result = runCli(["--help"]);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("Run this CLI from the TStack repository");
    expect(result.stdout).toContain("pnpm tstack <command> [options]");
    expect(result.stdout).toContain("init");
    expect(result.stdout).toContain("ready");
    expect(result.stdout).toContain("products");
  });

  it("is exposed through the root pnpm tstack script", () => {
    const rootPackage = JSON.parse(
      readFileSync(new URL("../../../package.json", import.meta.url), "utf8"),
    ) as { scripts?: Record<string, string> };

    expect(rootPackage.scripts?.tstack).toBe("pnpm --filter @tstack/cli tstack");
  });

  it("is a private @tstack/cli workspace package without publishing config", () => {
    const cliPackage = JSON.parse(
      readFileSync(new URL("../package.json", import.meta.url), "utf8"),
    ) as { name?: string; private?: boolean; publishConfig?: unknown };

    expect(cliPackage.name).toBe("@tstack/cli");
    expect(cliPackage.private).toBe(true);
    expect(cliPackage.publishConfig).toBeUndefined();
  });

  it("routes the ready command with interactive signal", () => {
    const result = runCli(["ready"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("Interactive mode required");
  });

  it("routes the products command", () => {
    const result = runCli(["products"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("Interactive mode required");
    expect(result.stderr).toContain("sandbox");
  });

  it("routes the init command and scaffolds a project", () => {
    const sourceDir = makeTempDir("tstack-init-source-");
    const targetDir = join(sourceDir, "../tstack-init-target-" + Date.now());

    try {
      writeFileSync(join(sourceDir, "README.md"), "# MyApp");
      writeFileSync(
        join(sourceDir, ".env.example"),
        "NEXT_PUBLIC_APP_NAME=MyApp\nBETTER_AUTH_SECRET=\n",
      );

      const result = runCli(["init", targetDir, "--app-name", "Test App"], { boilerplateSourcePath: sourceDir });

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toBe("");
      expect(result.stdout).toContain("Created TStack app");
      expect(existsSync(join(targetDir, "README.md"))).toBe(true);
      expect(readFileSync(join(targetDir, "README.md"), "utf8")).toBe("# Test App");
      expect(existsSync(join(targetDir, ".env"))).toBe(true);
    } finally {
      rmSync(sourceDir, { recursive: true, force: true });
      if (existsSync(targetDir)) rmSync(targetDir, { recursive: true, force: true });
    }
  });

  it("init requires a project directory argument", () => {
    const result = runCli(["init"]);

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("Usage: pnpm tstack init <project-dir>");
  });

  it("init shows command-specific help", () => {
    const result = runCli(["init", "--help"]);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("Usage: pnpm tstack init <project-dir>");
    expect(result.stdout).toContain("Scaffold a new TStack app");
  });

  it("init rejects unknown options", () => {
    const result = runCli(["init", "--bogus"]);

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain('Unknown option "--bogus" for tstack init');
  });

  it("init requires --app-name for non-interactive mode", () => {
    const result = runCli(["init", "my-app"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("Interactive mode required");
  });

  it("init accepts --app-name to scaffold with branding", () => {
    const sourceDir = makeTempDir("tstack-init-source-");
    const targetDir = join(tmpdir(), `branded-app-${Date.now()}`);
    const expectedSlug = targetDir.split("/").pop()!;

    try {
      writeFileSync(join(sourceDir, "package.json"), '{"name": "@tstack/boilerplate"}');
      writeFileSync(join(sourceDir, ".env.example"), "NEXT_PUBLIC_APP_NAME=MyApp\n");

      const result = runCli(["init", targetDir, "--app-name", "Branded App"], {
        boilerplateSourcePath: sourceDir,
      });

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toBe("");
      expect(result.stdout).toContain("Created TStack app");
      const pkg = JSON.parse(readFileSync(join(targetDir, "package.json"), "utf8"));
      expect(pkg.name).toBe(expectedSlug);
    } finally {
      rmSync(sourceDir, { recursive: true, force: true });
      if (existsSync(targetDir)) rmSync(targetDir, { recursive: true, force: true });
    }
  });

  it("init reports a clear error when the target already exists", () => {
    const sourceDir = makeTempDir("tstack-init-source-");
    const targetDir = makeTempDir("tstack-init-target-");

    try {
      const result = runCli(["init", targetDir, "--app-name", "Test App"], { boilerplateSourcePath: sourceDir });

      expect(result.exitCode).toBe(1);
      expect(result.stdout).toBe("");
      expect(result.stderr).toContain("Target directory already exists");
      expect(result.stderr).toContain(resolve(targetDir));
    } finally {
      rmSync(sourceDir, { recursive: true, force: true });
      rmSync(targetDir, { recursive: true, force: true });
    }
  });

  it("rejects unsupported root flags with a useful message", () => {
    const result = runCli(["--bogus"]);

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain('Unknown option "--bogus"');
    expect(result.stderr).toContain("pnpm tstack --help");
  });

  it("rejects unsupported commands with a useful message", () => {
    const result = runCli(["deploy"]);

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain('Unknown command "deploy"');
    expect(result.stderr).toContain("pnpm tstack --help");
  });

  it("rejects unsupported command flags with a useful message", () => {
    const result = runCli(["products", "--bogus"]);

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain('Unknown option "--bogus" for tstack products');
    expect(result.stderr).toContain("pnpm tstack products --help");
  });

  it.each(["sandbox", "production"])("accepts the products --env %s flag", (environment) => {
    const result = runCli(["products", "--env", environment]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain(`Environment: ${environment}`);
  });

  it("rejects unsupported products environments with a useful message", () => {
    const result = runCli(["products", "--env", "staging"]);

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain('Invalid value "staging" for --env');
    expect(result.stderr).toContain("Expected sandbox or production");
  });

  it("rejects unsupported flags after recognized products options", () => {
    const result = runCli(["products", "--env", "sandbox", "--bogus"]);

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain('Unknown option "--bogus" for tstack products');
  });

  it("ready shows command-specific help", () => {
    const result = runCli(["ready", "--help"]);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("Usage: pnpm tstack ready [--project-dir <path>]");
    expect(result.stdout).toContain("--project-dir <path>");
  });

  it("ready accepts --project-dir", () => {
    const result = runCli(["ready", "--project-dir", "/some/path"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("Interactive mode required");
  });

  it("ready rejects unknown options", () => {
    const result = runCli(["ready", "--bogus"]);

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain('Unknown option "--bogus" for tstack ready');
  });

  it("prints command-specific help", () => {
    const result = runCli(["products", "--help"]);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("Usage: pnpm tstack products [options]");
    expect(result.stdout).toContain("--env <sandbox|production>");
  });

  it("products defaults to sandbox and signals interactive mode", () => {
    const result = runCli(["products"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("Interactive mode required");
  });

  it("products --env sandbox signals interactive mode", () => {
    const result = runCli(["products", "--env", "sandbox"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("Interactive mode required");
  });

  it("products --env production signals interactive mode", () => {
    const result = runCli(["products", "--env", "production"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("Interactive mode required");
  });

  it("products --prod is shorthand for production and signals interactive mode", () => {
    const result = runCli(["products", "--prod"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("Interactive mode required");
    expect(result.stderr).toContain("production");
  });

  it("products --project-dir <path> signals interactive mode", () => {
    const result = runCli(["products", "--project-dir", "/some/path"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("Interactive mode required");
    expect(result.stderr).toContain("/some/path");
  });

  it("products combines --env and --project-dir", () => {
    const result = runCli(["products", "--env", "production", "--project-dir", "/some/path"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("Interactive mode required");
    expect(result.stderr).toContain("production");
    expect(result.stderr).toContain("/some/path");
  });

  it("products combines --prod and --project-dir", () => {
    const result = runCli(["products", "--prod", "--project-dir", "/some/path"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("Interactive mode required");
    expect(result.stderr).toContain("production");
    expect(result.stderr).toContain("/some/path");
  });

  it("products rejects --prod combined with --env", () => {
    const result = runCli(["products", "--prod", "--env", "production"]);

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("--prod");
    expect(result.stderr).toContain("--env");
  });

  it("products --token signals interactive mode with token", () => {
    const result = runCli(["products", "--token", "polar_test_123"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("Interactive mode required");
    expect(result.stderr).toContain("polar_test_123");
  });

  it("products combines --token, --env, and --project-dir", () => {
    const result = runCli(["products", "--env", "production", "--project-dir", "/some/path", "--token", "polar_test_123"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("Interactive mode required");
    expect(result.stderr).toContain("production");
    expect(result.stderr).toContain("/some/path");
    expect(result.stderr).toContain("polar_test_123");
  });

  it("products help mentions --token", () => {
    const result = runCli(["products", "--help"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("--token");
  });
});
