#!/usr/bin/env node
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import React from "react";

import { exportBoilerplate } from "./lib/export-boilerplate.js";
import { initProject } from "./lib/init-project.js";

export type CliResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
  /** Explicit signal that the command requires interactive (TUI) mode. */
  interactive?: boolean;
  /** Structured data for interactive mode routing. Avoids parsing human-readable stderr. */
  interactiveData?: {
    env: "sandbox" | "production";
    projectDir: string;
    token?: string;
  };
};

const rootHelp = `TStack CLI

Run this CLI from the TStack repository:
  pnpm tstack <command> [options]

Commands:
  init       Scaffold a TStack app from apps/boilerplate.
  ready      Prepare production environment configuration.
  products   Manage TStack product definitions.

Use "pnpm tstack <command> --help" for command-specific help.
`;

const supportedCommands = ["init", "ready", "products"] as const;

type SupportedCommand = (typeof supportedCommands)[number];
type ProductEnvironment = "sandbox" | "production";

function isSupportedCommand(command: string): command is SupportedCommand {
  return supportedCommands.includes(command as SupportedCommand);
}

function isProductEnvironment(value: string | undefined): value is ProductEnvironment {
  return value === "sandbox" || value === "production";
}

function unknownCommandOption(command: SupportedCommand, option: string): CliResult {
  return {
    exitCode: 1,
    stdout: "",
    stderr: `Unknown option "${option}" for tstack ${command}. Run "pnpm tstack ${command} --help" for usage.\n`,
  };
}

function commandHelp(command: SupportedCommand): string {
  if (command === "products") {
    return `TStack products

Usage: pnpm tstack products [options]

Manage TStack product definitions from the TStack repository.

Options:
  --env <sandbox|production>   Select the Polar environment. Defaults to sandbox.
  --token <token>              Polar access token (overrides .env files).
  -h, --help                   Show this help message.
`;
  }

  if (command === "init") {
    return `TStack init

Usage: pnpm tstack init <project-dir> [--app-name <name>]

Scaffold a new TStack app by exporting apps/boilerplate to the target directory.

Options:
  --app-name <name>   Set the display app name (skips interactive prompt).
  -h, --help          Show this help message.
`;
  }

  if (command === "ready") {
    return `TStack ready

Usage: pnpm tstack ready [--project-dir <path>]

Run an interactive production environment wizard for a TStack scaffolded app.

Options:
  --project-dir <path>   Path to the scaffolded app directory. Defaults to the current directory.
  -h, --help             Show this help message.
`;
  }

  return `TStack ${command}

Usage: pnpm tstack ${command} [options]

This command is routed by the TStack repository CLI.

Options:
  -h, --help   Show this help message.
`;
}

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

function resolveProjectDir(projectDir: string): string {
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

function resolveBoilerplateSourcePath(): string {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  return resolve(__dirname, "../../../apps/boilerplate");
}

function routeCommand(
  command: SupportedCommand,
  args: string[],
  options?: { boilerplateSourcePath?: string },
): CliResult {
  if (args[0] === "--help" || args[0] === "-h") {
    return {
      exitCode: 0,
      stdout: commandHelp(command),
      stderr: "",
    };
  }

  const unknownOption = args.find((arg) => arg.startsWith("-"));

  if (command === "init") {
    const appNameIndex = args.indexOf("--app-name");
    const appName = appNameIndex !== -1 ? args[appNameIndex + 1] : undefined;
    const remainingArgs =
      appNameIndex !== -1
        ? args.filter((_, i) => i !== appNameIndex && i !== appNameIndex + 1)
        : args;
    const unknownOpt = remainingArgs.find((arg) => arg.startsWith("-"));

    if (unknownOpt) {
      return unknownCommandOption(command, unknownOpt);
    }

    if (remainingArgs.length === 0) {
      return {
        exitCode: 1,
        stdout: "",
        stderr: `Usage: pnpm tstack init <project-dir> [--app-name <name>]\n`,
      };
    }

    const projectDir = remainingArgs[0];
    const targetPath = resolveProjectDir(projectDir);
    const slug = targetPath.split("/").pop() ?? projectDir;

    if (!appName) {
      return {
        exitCode: 0,
        stdout: "",
        stderr: `Interactive mode required. Use --app-name to run non-interactively, or use the wizard.\n`,
        interactive: true,
      };
    }

    try {
      initProject({
        sourceDir: options?.boilerplateSourcePath ?? resolveBoilerplateSourcePath(),
        targetDir: targetPath,
        slug,
        displayName: appName,
        providers: {
          github: false,
          twitter: false,
          walletConnect: false,
          polar: false,
          digitalOcean: false,
          analytics: "none",
        },
        initGit: true,
        installDeps: true,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        exitCode: 1,
        stdout: "",
        stderr: `Error: ${message}\n`,
      };
    }

    return {
      exitCode: 0,
      stdout: `Created TStack app at ${targetPath}\n`,
      stderr: "",
    };
  }

  if (command === "ready") {
    const projectDirIndex = args.indexOf("--project-dir");
    const remainingArgs =
      projectDirIndex !== -1
        ? args.filter((_, i) => i !== projectDirIndex && i !== projectDirIndex + 1)
        : args;
    const unknownOpt = remainingArgs.find((arg) => arg.startsWith("-"));

    if (unknownOpt) {
      return unknownCommandOption(command, unknownOpt);
    }

    return {
      exitCode: 0,
      stdout: "",
      stderr: `Interactive mode required. Use the wizard to configure the production environment.\n`,
      interactive: true,
    };
  }

  if (command === "products") {
    const envIndex = args.indexOf("--env");
    const prodFlag = args.includes("--prod");
    const projectDirIndex = args.indexOf("--project-dir");
    const tokenIndex = args.indexOf("--token");

    if (prodFlag && envIndex !== -1) {
      return {
        exitCode: 1,
        stdout: "",
        stderr: `Cannot use --prod and --env together. Use one or the other.\n`,
      };
    }

    if (envIndex !== -1) {
      const envValue = args[envIndex + 1];
      if (!isProductEnvironment(envValue)) {
        return {
          exitCode: 1,
          stdout: "",
          stderr: `Invalid value "${envValue ?? ""}" for --env. Expected sandbox or production.\n`,
        };
      }
    }

    const remainingArgs = args.filter((_, i) => {
      if (envIndex !== -1 && (i === envIndex || i === envIndex + 1)) return false;
      if (projectDirIndex !== -1 && (i === projectDirIndex || i === projectDirIndex + 1)) return false;
      if (tokenIndex !== -1 && (i === tokenIndex || i === tokenIndex + 1)) return false;
      if (args[i] === "--prod") return false;
      return true;
    });

    const unknownOpt = remainingArgs.find((arg) => arg.startsWith("-"));
    if (unknownOpt) {
      return unknownCommandOption(command, unknownOpt);
    }

    const env: ProductEnvironment = prodFlag
      ? "production"
      : envIndex !== -1
        ? (args[envIndex + 1] as ProductEnvironment)
        : "sandbox";

    const projectDir = projectDirIndex !== -1 ? args[projectDirIndex + 1] : ".";
    const token = tokenIndex !== -1 ? args[tokenIndex + 1] : undefined;

    return {
      exitCode: 0,
      stdout: "",
      stderr: "Interactive mode required.\n",
      interactive: true,
      interactiveData: {
        env,
        projectDir: resolve(projectDir),
        token,
      },
    };
  }

  if (unknownOption) {
    return unknownCommandOption(command, unknownOption);
  }

  return {
    exitCode: 0,
    stdout: `tstack ${command} route is available, but the workflow is not implemented yet.\n`,
    stderr: "",
  };
}

export function runCli(
  args: string[],
  options?: { boilerplateSourcePath?: string },
): CliResult {
  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    return {
      exitCode: 0,
      stdout: rootHelp,
      stderr: "",
    };
  }

  const [command] = args;

  if (command.startsWith("-")) {
    return {
      exitCode: 1,
      stdout: "",
      stderr: `Unknown option "${command}". Run "pnpm tstack --help" for usage.\n`,
    };
  }

  if (isSupportedCommand(command)) {
    return routeCommand(command, args.slice(1), options);
  }

  return {
    exitCode: 1,
    stdout: "",
    stderr: `Unknown command "${command}". Run "pnpm tstack --help" for usage.\n`,
  };
}

export async function runCliAsync(
  args: string[],
  options?: { boilerplateSourcePath?: string },
): Promise<CliResult> {
  const syncResult = runCli(args, options);

  // If the sync result already resolved the command, return it.
  if (syncResult.stdout !== "" || syncResult.stderr !== "" || syncResult.exitCode !== 0) {
    // Check if this is the interactive-init signal
    if (
      args[0] === "init" &&
      syncResult.interactive
    ) {
      const projectDir = args[1];
      if (!projectDir) {
        return {
          exitCode: 1,
          stdout: "",
          stderr: `Usage: pnpm tstack init <project-dir> [--app-name <name>]\n`,
        };
      }

      const { render } = await import("ink");
      const { Wizard } = await import("./Wizard.js");

      await new Promise<void>((done) => {
        render(
          React.createElement(Wizard, {
            projectDir: resolveProjectDir(projectDir),
            sourceDir: options?.boilerplateSourcePath ?? resolveBoilerplateSourcePath(),
            onComplete: done,
          }),
        );
      });

      return {
        exitCode: 0,
        stdout: "",
        stderr: "",
      };
    }

    // Check if this is the interactive-ready signal
    if (
      args[0] === "ready" &&
      syncResult.interactive
    ) {
      const projectDirIndex = args.indexOf("--project-dir");
      const projectDir = projectDirIndex !== -1 ? args[projectDirIndex + 1] : ".";

      const { render } = await import("ink");
      const { ReadyWizard } = await import("./ReadyWizard.js");

      await new Promise<void>((done) => {
        render(
          React.createElement(ReadyWizard, {
            projectDir: resolve(projectDir),
            onComplete: done,
          }),
        );
      });

      return {
        exitCode: 0,
        stdout: "",
        stderr: "",
      };
    }

    // Check if this is the interactive-products signal
    if (
      args[0] === "products" &&
      syncResult.interactive
    ) {
      const data = syncResult.interactiveData;
      const env = data?.env ?? "sandbox";
      const projectDir = data?.projectDir ?? ".";
      const token = data?.token;

      const { render } = await import("ink");
      const { ProductsWizard } = await import("./ProductsWizard.js");

      await new Promise<void>((done) => {
        render(
          React.createElement(ProductsWizard, {
            projectDir: resolve(projectDir),
            env,
            token,
            onComplete: done,
          }),
        );
      });

      return {
        exitCode: 0,
        stdout: "",
        stderr: "",
      };
    }

    return syncResult;
  }

  return syncResult;
}

function writeResult(result: CliResult): void {
  if (result.stdout.length > 0) {
    process.stdout.write(result.stdout);
  }

  if (result.stderr.length > 0) {
    process.stderr.write(result.stderr);
  }

  process.exitCode = result.exitCode;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCliAsync(process.argv.slice(2)).then(writeResult).catch((error) => {
    process.stderr.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
