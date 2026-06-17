import { describe, expect, it } from "vitest";
import { mkdtempSync, writeFileSync, rmSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  readProjectEnv,
  detectEnabledGroups,
  writeProductionEnv,
  generateProductionEnv,
  type OptionalGroup,
} from "./env-ready.js";

function makeTempDir(prefix: string): string {
  return mkdtempSync(join(tmpdir(), prefix));
}

describe("readProjectEnv", () => {
  it("throws when .env.example is missing", () => {
    const projectDir = makeTempDir("tstack-ready-no-example-");
    try {
      expect(() => readProjectEnv(projectDir)).toThrow(".env.example not found");
    } finally {
      rmSync(projectDir, { recursive: true, force: true });
    }
  });

  it("reads .env.example and .env when present", () => {
    const projectDir = makeTempDir("tstack-ready-example-");
    try {
      writeFileSync(join(projectDir, ".env.example"), "NEXT_PUBLIC_APP_NAME=MyApp\nDATABASE_URL=\n");
      writeFileSync(join(projectDir, ".env"), "NEXT_PUBLIC_APP_NAME=Acme\nDATABASE_URL=postgresql://localhost\n");

      const result = readProjectEnv(projectDir);
      expect(result.exampleContent).toContain("NEXT_PUBLIC_APP_NAME=MyApp");
      expect(result.envValues.NEXT_PUBLIC_APP_NAME).toBe("Acme");
      expect(result.envValues.DATABASE_URL).toBe("postgresql://localhost");
    } finally {
      rmSync(projectDir, { recursive: true, force: true });
    }
  });

  it("returns empty envValues when .env is missing", () => {
    const projectDir = makeTempDir("tstack-ready-missing-env-");
    try {
      writeFileSync(join(projectDir, ".env.example"), "NEXT_PUBLIC_APP_NAME=MyApp\n");

      const result = readProjectEnv(projectDir);
      expect(result.envValues).toEqual({});
    } finally {
      rmSync(projectDir, { recursive: true, force: true });
    }
  });
});

describe("detectEnabledGroups", () => {
  it("returns no groups for empty env values", () => {
    const groups = detectEnabledGroups({}, "");
    expect(groups).toEqual([]);
  });

  it("detects github when GITHUB_CLIENT_ID is set", () => {
    const groups = detectEnabledGroups({ GITHUB_CLIENT_ID: "abc" }, "");
    expect(groups).toContain("github");
  });

  it("detects twitter when TWITTER_CLIENT_ID is set", () => {
    const groups = detectEnabledGroups({ TWITTER_CLIENT_ID: "xyz" }, "");
    expect(groups).toContain("twitter");
  });

  it("detects walletConnect when NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID is set", () => {
    const groups = detectEnabledGroups({ NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID: "123" }, "");
    expect(groups).toContain("walletConnect");
  });

  it("detects analytics when NEXT_PUBLIC_ANALYTICS_PROVIDER has a non-none value", () => {
    const groups = detectEnabledGroups({ NEXT_PUBLIC_ANALYTICS_PROVIDER: "umami" }, "");
    expect(groups).toContain("analytics");
  });

  it("does not detect analytics when NEXT_PUBLIC_ANALYTICS_PROVIDER is none", () => {
    const groups = detectEnabledGroups({ NEXT_PUBLIC_ANALYTICS_PROVIDER: "none" }, "");
    expect(groups).not.toContain("analytics");
  });

  it("detects fileUploads when FILE_UPLOAD_PROVIDER is digitalocean", () => {
    const groups = detectEnabledGroups({ FILE_UPLOAD_PROVIDER: "digitalocean" }, "");
    expect(groups).toContain("fileUploads");
  });

  it("does not detect fileUploads when FILE_UPLOAD_PROVIDER is database", () => {
    const groups = detectEnabledGroups({ FILE_UPLOAD_PROVIDER: "database" }, "");
    expect(groups).not.toContain("fileUploads");
  });

  it("detects emailBranding when EMAIL_BRAND_LOGO_URL is set", () => {
    const groups = detectEnabledGroups({ EMAIL_BRAND_LOGO_URL: "https://logo.png" }, "");
    expect(groups).toContain("emailBranding");
  });

  it("detects support when SUPPORT_EMAIL is set", () => {
    const groups = detectEnabledGroups({ SUPPORT_EMAIL: "help@example.com" }, "");
    expect(groups).toContain("support");
  });

  it("detects landingMode when LANDING_MODE is true", () => {
    const groups = detectEnabledGroups({ LANDING_MODE: "true" }, "");
    expect(groups).toContain("landingMode");
  });

  it("does not detect landingMode when LANDING_MODE is false", () => {
    const groups = detectEnabledGroups({ LANDING_MODE: "false" }, "");
    expect(groups).not.toContain("landingMode");
  });

  it("detects multiple groups at once", () => {
    const groups = detectEnabledGroups(
      {
        GITHUB_CLIENT_ID: "abc",
        TWITTER_CLIENT_ID: "xyz",
        NEXT_PUBLIC_ANALYTICS_PROVIDER: "posthog",
        LANDING_MODE: "true",
      },
      "",
    );
    expect(groups).toContain("github");
    expect(groups).toContain("twitter");
    expect(groups).toContain("analytics");
    expect(groups).toContain("landingMode");
    expect(groups).not.toContain("walletConnect");
    expect(groups).not.toContain("fileUploads");
  });
});

describe("generateProductionEnv", () => {
  it("generates production env from example and values", () => {
    const example = `PROJECT_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=MyApp
DATABASE_URL=
BETTER_AUTH_SECRET=
`;
    const result = generateProductionEnv({
      exampleContent: example,
      values: {
        PROJECT_URL: "https://myapp.com",
        NEXT_PUBLIC_APP_NAME: "MyApp",
        DATABASE_URL: "postgresql://prod:pass@db/myapp",
        BETTER_AUTH_SECRET: "secret123",
      },
    });

    expect(result).toContain("PROJECT_URL=https://myapp.com");
    expect(result).toContain("NEXT_PUBLIC_APP_NAME=MyApp");
    expect(result).toContain("DATABASE_URL=postgresql://prod:pass@db/myapp");
    expect(result).toContain("BETTER_AUTH_SECRET=secret123");
  });

  it("preserves comments and blank lines from the example", () => {
    const example = `# Project Configuration
PROJECT_URL=http://localhost:3000

# Database
DATABASE_URL=
`;
    const result = generateProductionEnv({
      exampleContent: example,
      values: { PROJECT_URL: "https://myapp.com" },
    });

    expect(result).toContain("# Project Configuration");
    expect(result).toContain("# Database");
    expect(result).toContain("PROJECT_URL=https://myapp.com");
  });

  it("replaces empty values in the example", () => {
    const example = `EMPTY=
FILLED=value`;
    const result = generateProductionEnv({
      exampleContent: example,
      values: { EMPTY: "now-filled", FILLED: "replaced" },
    });
    expect(result).toContain("EMPTY=now-filled");
    expect(result).toContain("FILLED=replaced");
  });
});

describe("writeProductionEnv", () => {
  it("writes .env.production in the project directory", () => {
    const projectDir = makeTempDir("tstack-ready-write-");
    try {
      writeFileSync(join(projectDir, ".env.example"), "NEXT_PUBLIC_APP_NAME=\n");
      const result = writeProductionEnv({
        projectDir,
        content: "NEXT_PUBLIC_APP_NAME=MyApp\n",
      });

      expect(result.path).toBe(join(projectDir, ".env.production"));
      expect(result.existed).toBe(false);
      expect(existsSync(result.path)).toBe(true);
      expect(readFileSync(result.path, "utf8")).toBe("NEXT_PUBLIC_APP_NAME=MyApp\n");
    } finally {
      rmSync(projectDir, { recursive: true, force: true });
    }
  });

  it("throws when .env.production exists and overwrite is false", () => {
    const projectDir = makeTempDir("tstack-ready-overwrite-");
    try {
      writeFileSync(join(projectDir, ".env.example"), "NEXT_PUBLIC_APP_NAME=\n");
      writeFileSync(join(projectDir, ".env.production"), "OLD=VALUE\n");

      expect(() =>
        writeProductionEnv({
          projectDir,
          content: "NEXT_PUBLIC_APP_NAME=MyApp\n",
          overwrite: false,
        }),
      ).toThrow(".env.production already exists");
    } finally {
      rmSync(projectDir, { recursive: true, force: true });
    }
  });

  it("overwrites when .env.production exists and overwrite is true", () => {
    const projectDir = makeTempDir("tstack-ready-overwrite-ok-");
    try {
      writeFileSync(join(projectDir, ".env.example"), "NEXT_PUBLIC_APP_NAME=\n");
      writeFileSync(join(projectDir, ".env.production"), "OLD=VALUE\n");

      const result = writeProductionEnv({
        projectDir,
        content: "NEXT_PUBLIC_APP_NAME=MyApp\n",
        overwrite: true,
      });

      expect(result.existed).toBe(true);
      expect(readFileSync(result.path, "utf8")).toBe("NEXT_PUBLIC_APP_NAME=MyApp\n");
    } finally {
      rmSync(projectDir, { recursive: true, force: true });
    }
  });
});
