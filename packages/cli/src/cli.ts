#!/usr/bin/env node
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { exportBoilerplate } from "./lib/export-boilerplate.js";

export type CliResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
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
  -h, --help                   Show this help message.
`;
  }

  if (command === "init") {
    return `TStack init

Usage: pnpm tstack init <project-dir>

Scaffold a new TStack app by exporting apps/boilerplate to the target directory.

Options:
  -h, --help   Show this help message.
`;
  }

  return `TStack ${command}

Usage: pnpm tstack ${command} [options]

This command is routed by the TStack repository CLI.

Options:
  -h, --help   Show this help message.
`;
}

function resolveBoilerplateSourcePath(): string {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  return resolve(__dirname, "../../apps/boilerplate");
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
    if (unknownOption) {
      return unknownCommandOption(command, unknownOption);
    }

    if (args.length === 0) {
      return {
        exitCode: 1,
        stdout: "",
        stderr: `Usage: pnpm tstack init <project-dir>\n`,
      };
    }

    const projectDir = args[0];

    try {
      exportBoilerplate({
        sourceDir: options?.boilerplateSourcePath ?? resolveBoilerplateSourcePath(),
        targetDir: resolve(projectDir),
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
      stdout: `Created TStack app at ${resolve(projectDir)}\n`,
      stderr: "",
    };
  }

  if (command === "products" && args[0] === "--env") {
    if (!isProductEnvironment(args[1])) {
      return {
        exitCode: 1,
        stdout: "",
        stderr: `Invalid value "${args[1] ?? ""}" for --env. Expected sandbox or production.\n`,
      };
    }

    const extraOption = args.slice(2).find((arg) => arg.startsWith("-"));

    if (extraOption) {
      return unknownCommandOption(command, extraOption);
    }

    return {
      exitCode: 0,
      stdout: `tstack products route is available, but the workflow is not implemented yet.\nEnvironment: ${args[1]}\n`,
      stderr: "",
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
  writeResult(runCli(process.argv.slice(2)));
}
