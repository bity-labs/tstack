import { Box, Text } from "ink";
import React, { useState } from "react";

import { Header } from "./components/Header.js";
import { TextInput } from "./components/TextInput.js";
import { Confirm } from "./components/Confirm.js";
import { Select } from "./components/Select.js";
import { MultiSelect } from "./components/MultiSelect.js";
import { StatusMessage } from "./components/StatusMessage.js";
import { validateProjectSlug } from "./lib/validate.js";
import { resolveProjectDir } from "./lib/resolve-project-dir.js";
import { initProject, type ProviderConfig } from "./lib/init-project.js";

type WizardStep =
  | "projectDir"
  | "slug"
  | "displayName"
  | "providers"
  | "analytics"
  | "envConfig"
  | "gitConfirm"
  | "installConfirm"
  | "running"
  | "done"
  | "error";

interface EnvQuestion {
  key: string;
  label: string;
  placeholder?: string;
  mask?: string;
}

export interface WizardProps {
  projectDir?: string;
  sourceDir: string;
  onComplete?: () => void;
}

export function Wizard({ projectDir: initialProjectDir, sourceDir, onComplete }: WizardProps) {
  const [step, setStep] = useState<WizardStep>(initialProjectDir ? "slug" : "projectDir");
  const [projectDir, setProjectDir] = useState(initialProjectDir ?? "");
  const [slug, setSlug] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [providers, setProviders] = useState<ProviderConfig>({
    github: false,
    twitter: false,
    walletConnect: false,
    polar: false,
    digitalOcean: false,
    analytics: "none",
  });
  const [envQuestions, setEnvQuestions] = useState<EnvQuestion[]>([]);
  const [currentEnvIndex, setCurrentEnvIndex] = useState(0);
  const [envValues, setEnvValues] = useState<Record<string, string>>({});
  const [initGit, setInitGit] = useState(false);
  const [installDeps, setInstallDeps] = useState(false);
  const [error, setError] = useState("");

  const handleProjectDirSubmit = (value: string) => {
    const name = value.trim();
    if (!name) {
      setError("Project directory name is required.");
      return;
    }
    const validation = validateProjectSlug(name);
    if (validation) {
      setError(validation);
      return;
    }
    setError("");
    setProjectDir(resolveProjectDir(name));
    setSlug(name);
    setStep("displayName");
  };

  const handleSlugSubmit = (value: string) => {
    const validation = validateProjectSlug(value);
    if (validation) {
      setError(validation);
      return;
    }
    setError("");
    setSlug(value);
    setStep("displayName");
  };

  const handleDisplayNameSubmit = (value: string) => {
    const name = value.trim() || slug;
    setDisplayName(name);
    setStep("providers");
  };

  const handleProvidersSubmit = (selected: string[]) => {
    setProviders((p) => ({
      ...p,
      github: selected.includes("github"),
      twitter: selected.includes("twitter"),
      walletConnect: selected.includes("walletConnect"),
      polar: selected.includes("polar"),
      digitalOcean: selected.includes("digitalOcean"),
    }));
    setStep("analytics");
  };

  const handleAnalyticsSelect = (value: string) => {
    const nextProviders = { ...providers, analytics: value as ProviderConfig["analytics"] };
    setProviders(nextProviders);

    const questions: EnvQuestion[] = [];

    if (nextProviders.github) {
      questions.push({ key: "GITHUB_CLIENT_ID", label: "GitHub Client ID" });
      questions.push({ key: "GITHUB_CLIENT_SECRET", label: "GitHub Client Secret", mask: "*" });
    }
    if (nextProviders.twitter) {
      questions.push({ key: "TWITTER_CLIENT_ID", label: "Twitter Client ID" });
      questions.push({ key: "TWITTER_CLIENT_SECRET", label: "Twitter Client Secret", mask: "*" });
    }
    if (nextProviders.walletConnect) {
      questions.push({ key: "NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID", label: "WalletConnect Project ID" });
    }
    if (nextProviders.polar) {
      questions.push({ key: "POLAR_ACCESS_TOKEN", label: "Polar Access Token", mask: "*" });
      questions.push({ key: "POLAR_ORGANIZATION_ID", label: "Polar Organization ID" });
      questions.push({ key: "POLAR_WEBHOOK_SECRET", label: "Polar Webhook Secret", mask: "*" });
    }
    if (nextProviders.digitalOcean) {
      questions.push({ key: "DIGITALOCEAN_SPACES_BUCKET", label: "DigitalOcean Spaces Bucket" });
      questions.push({ key: "DIGITALOCEAN_SPACES_ACCESS_KEY_ID", label: "DigitalOcean Spaces Access Key ID" });
      questions.push({ key: "DIGITALOCEAN_SPACES_SECRET_ACCESS_KEY", label: "DigitalOcean Spaces Secret Access Key", mask: "*" });
      questions.push({ key: "DIGITALOCEAN_SPACES_CDN", label: "DigitalOcean Spaces CDN URL (optional)", placeholder: "https://cdn.example.com" });
    }
    if (nextProviders.analytics === "umami") {
      questions.push({ key: "NEXT_PUBLIC_UMAMI_WEBSITE_ID", label: "Umami Website ID" });
    }
    if (nextProviders.analytics === "posthog") {
      questions.push({ key: "NEXT_PUBLIC_POSTHOG_KEY", label: "PostHog API Key" });
    }

    // Core email configuration
    questions.push({ key: "RESEND_API_KEY", label: "Resend API Key", mask: "*" });
    questions.push({ key: "EMAIL_FROM_ADDRESS", label: "Email From Address", placeholder: `no-reply@${slug}.com` });
    questions.push({ key: "SUPPORT_EMAIL", label: "Support Email", placeholder: `support@${slug}.com` });
    questions.push({ key: "EMAIL_BRAND_LOGO_URL", label: "Email Brand Logo URL (optional)", placeholder: `https://${slug}.com/logo.png` });

    setEnvQuestions(questions);
    setCurrentEnvIndex(0);

    if (questions.length > 0) {
      setStep("envConfig");
    } else {
      setStep("gitConfirm");
    }
  };

  const handleEnvValueSubmit = (value: string) => {
    const question = envQuestions[currentEnvIndex];
    if (!question) return;

    setEnvValues((prev) => ({ ...prev, [question.key]: value }));

    if (currentEnvIndex + 1 < envQuestions.length) {
      setCurrentEnvIndex((i) => i + 1);
    } else {
      setStep("gitConfirm");
    }
  };

  const handleGitConfirm = (confirmed: boolean) => {
    setInitGit(confirmed);
    setStep("installConfirm");
  };

  const handleInstallConfirm = (confirmed: boolean) => {
    setInstallDeps(confirmed);
    setStep("running");

    try {
      initProject({
        sourceDir,
        targetDir: projectDir,
        slug,
        displayName: displayName || slug,
        providers: {
          ...providers,
          analytics: providers.analytics,
        },
        envOverrides: envValues,
        initGit,
        installDeps: confirmed,
      });
      setStep("done");
      onComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStep("error");
    }
  };

  return (
    <Box flexDirection="column">
      <Header />
      {step === "projectDir" && (
        <Box flexDirection="column">
          <TextInput
            label="Project directory name"
            value={slug}
            onChange={setSlug}
            onSubmit={handleProjectDirSubmit}
            placeholder="my-app"
            error={error}
          />
          <Text dimColor>Lowercase letters, numbers, and hyphens only. Created as a sibling to the tstack repo.</Text>
        </Box>
      )}
      {step === "slug" && (
        <Box flexDirection="column">
          <TextInput
            label="Project slug"
            value={slug}
            onChange={setSlug}
            onSubmit={handleSlugSubmit}
            placeholder="my-app"
            error={error}
          />
          <Text dimColor>Lowercase letters, numbers, and hyphens only.</Text>
        </Box>
      )}
      {step === "displayName" && (
        <TextInput
          label="App display name"
          value={displayName}
          onChange={setDisplayName}
          onSubmit={handleDisplayNameSubmit}
          placeholder={slug}
        />
      )}
      {step === "providers" && (
        <MultiSelect
          label="Select providers to configure"
          items={[
            { label: "GitHub OAuth", value: "github" },
            { label: "Twitter OAuth", value: "twitter" },
            { label: "WalletConnect", value: "walletConnect" },
            { label: "Polar (billing)", value: "polar" },
            { label: "DigitalOcean Spaces (file uploads)", value: "digitalOcean" },
          ]}
          onSubmit={handleProvidersSubmit}
        />
      )}
      {step === "analytics" && (
        <Select
          label="Analytics provider"
          options={[
            { label: "None", value: "none" },
            { label: "Umami", value: "umami" },
            { label: "PostHog", value: "posthog" },
          ]}
          onSelect={handleAnalyticsSelect}
        />
      )}
      {step === "envConfig" && envQuestions[currentEnvIndex] && (
        <TextInput
          label={`${envQuestions[currentEnvIndex].label} (${currentEnvIndex + 1}/${envQuestions.length})`}
          value={envValues[envQuestions[currentEnvIndex].key] || ""}
          onChange={(v) => setEnvValues((prev) => ({ ...prev, [envQuestions[currentEnvIndex].key]: v }))}
          onSubmit={handleEnvValueSubmit}
          placeholder={envQuestions[currentEnvIndex].placeholder || ""}
          mask={envQuestions[currentEnvIndex].mask}
        />
      )}
      {step === "gitConfirm" && (
        <Box flexDirection="column">
          <Text>Initialize a git repository in the project?</Text>
          <Confirm label="Initialize git" onConfirm={handleGitConfirm} defaultValue={true} />
        </Box>
      )}
      {step === "installConfirm" && (
        <Box flexDirection="column">
          <Text>Install dependencies with pnpm?</Text>
          <Confirm label="Install dependencies" onConfirm={handleInstallConfirm} defaultValue={true} />
        </Box>
      )}
      {step === "running" && <StatusMessage status="info">Setting up your TStack app...</StatusMessage>}
      {step === "done" && (
        <StatusMessage status="success">TStack app created at {projectDir}</StatusMessage>
      )}
      {step === "error" && <StatusMessage status="error">{error}</StatusMessage>}
    </Box>
  );
}
