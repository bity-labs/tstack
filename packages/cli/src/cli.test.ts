import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { runCli } from "./cli.js";

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

  it.each(["init", "ready", "products"])("routes the %s command", (command) => {
    const result = runCli([command]);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain(`tstack ${command}`);
    expect(result.stdout).toContain("not implemented yet");
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
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain(`Environment: ${environment}`);
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

  it("prints command-specific help", () => {
    const result = runCli(["products", "--help"]);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("Usage: pnpm tstack products [options]");
    expect(result.stdout).toContain("--env <sandbox|production>");
  });
});
