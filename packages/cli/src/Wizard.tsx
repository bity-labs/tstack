import { Box, Text } from "ink";
import React, { useState } from "react";

import { Header } from "./components/Header.js";
import { TextInput } from "./components/TextInput.js";
import { Confirm } from "./components/Confirm.js";
import { Select } from "./components/Select.js";
import { StatusMessage } from "./components/StatusMessage.js";
import { validateProjectSlug } from "./lib/validate.js";
import { initProject, type ProviderConfig } from "./lib/init-project.js";

type WizardStep =
  | "slug"
  | "displayName"
  | "providers"
  | "analytics"
  | "gitConfirm"
  | "installConfirm"
  | "running"
  | "done"
  | "error";

export interface WizardProps {
  projectDir: string;
  sourceDir: string;
  onComplete?: () => void;
}

export function Wizard({ projectDir, sourceDir, onComplete }: WizardProps) {
  const [step, setStep] = useState<WizardStep>("slug");
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
  const [initGit, setInitGit] = useState(false);
  const [installDeps, setInstallDeps] = useState(false);
  const [error, setError] = useState("");

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

  const handleProvidersConfirm = (confirmed: boolean) => {
    if (!confirmed) {
      setStep("analytics");
      return;
    }
    setProviders((p) => ({ ...p, github: true, twitter: true, walletConnect: true, polar: true, digitalOcean: true }));
    setStep("analytics");
  };

  const handleAnalyticsSelect = (value: string) => {
    setProviders((p) => ({ ...p, analytics: value as ProviderConfig["analytics"] }));
    setStep("gitConfirm");
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
        <Box flexDirection="column">
          <Text>Enable all providers (GitHub, Twitter, WalletConnect, Polar, DigitalOcean Spaces)?</Text>
          <Confirm label="Enable all" onConfirm={handleProvidersConfirm} defaultValue={false} />
        </Box>
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
