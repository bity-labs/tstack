import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { generateEnv } from "./env.js";

export type OptionalGroup =
  | "github"
  | "twitter"
  | "walletConnect"
  | "analytics"
  | "fileUploads"
  | "emailBranding"
  | "support"
  | "landingMode";

const OPTIONAL_GROUP_KEYS: Record<OptionalGroup, string[]> = {
  github: ["GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET"],
  twitter: ["TWITTER_CLIENT_ID", "TWITTER_CLIENT_SECRET"],
  walletConnect: ["NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID"],
  analytics: [
    "NEXT_PUBLIC_ANALYTICS_PROVIDER",
    "NEXT_PUBLIC_UMAMI_WEBSITE_ID",
    "NEXT_PUBLIC_UMAMI_HOST",
    "NEXT_PUBLIC_POSTHOG_KEY",
    "NEXT_PUBLIC_POSTHOG_HOST",
  ],
  fileUploads: [
    "FILE_UPLOAD_PROVIDER",
    "DIGITALOCEAN_SPACES_ENDPOINT",
    "DIGITALOCEAN_SPACES_REGION",
    "DIGITALOCEAN_SPACES_BUCKET",
    "DIGITALOCEAN_SPACES_ACCESS_KEY_ID",
    "DIGITALOCEAN_SPACES_SECRET_ACCESS_KEY",
    "DIGITALOCEAN_SPACES_CDN",
    "MAX_FILE_SIZE_MB",
  ],
  emailBranding: ["EMAIL_BRAND_LOGO_URL"],
  support: ["SUPPORT_EMAIL"],
  landingMode: ["LANDING_MODE"],
};

export interface ProjectEnv {
  examplePath: string;
  exampleContent: string;
  envPath: string;
  envValues: Record<string, string>;
}

export function readProjectEnv(projectDir: string): ProjectEnv {
  const examplePath = join(projectDir, ".env.example");
  if (!existsSync(examplePath)) {
    throw new Error(`.env.example not found at ${examplePath}`);
  }
  const exampleContent = readFileSync(examplePath, "utf8");

  const envPath = join(projectDir, ".env");
  const envValues: Record<string, string> = {};
  if (existsSync(envPath)) {
    const envContent = readFileSync(envPath, "utf8");
    for (const line of envContent.split("\n")) {
      const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (match) {
        envValues[match[1]] = match[2];
      }
    }
  }

  return { examplePath, exampleContent, envPath, envValues };
}

export function detectEnabledGroups(
  envValues: Record<string, string>,
  _exampleContent: string,
): OptionalGroup[] {
  const groups: OptionalGroup[] = [];

  for (const [group, keys] of Object.entries(OPTIONAL_GROUP_KEYS) as [OptionalGroup, string[]][]) {
    const isEnabled = keys.some((key) => {
      const value = envValues[key];
      if (value === undefined || value === "") return false;
      if (key === "NEXT_PUBLIC_ANALYTICS_PROVIDER" && value === "none") return false;
      if (key === "FILE_UPLOAD_PROVIDER" && value === "database") return false;
      if (key === "LANDING_MODE" && value !== "true") return false;
      return true;
    });

    if (isEnabled) {
      groups.push(group);
    }
  }

  return groups;
}

export function generateProductionEnv(options: {
  exampleContent: string;
  values: Record<string, string>;
}): string {
  return generateEnv(options);
}

export function writeProductionEnv(options: {
  projectDir: string;
  content: string;
  overwrite?: boolean;
}): { path: string; existed: boolean } {
  const { projectDir, content, overwrite = false } = options;
  const examplePath = join(projectDir, ".env.example");
  if (!existsSync(examplePath)) {
    throw new Error(`.env.example not found at ${examplePath}`);
  }

  const path = join(projectDir, ".env.production");
  const existed = existsSync(path);
  if (existed && !overwrite) {
    throw new Error(".env.production already exists. Use --overwrite to replace it.");
  }

  writeFileSync(path, content);
  return { path, existed };
}
