import { Box, Text } from "ink";
import React, { useState, useMemo, useCallback } from "react";

import { Header } from "./components/Header.js";
import { TextInput } from "./components/TextInput.js";
import { MultiSelect } from "./components/MultiSelect.js";
import { Confirm } from "./components/Confirm.js";
import { StatusMessage } from "./components/StatusMessage.js";
import {
  readProjectEnv,
  detectEnabledGroups,
  generateProductionEnv,
  writeProductionEnv,
  type OptionalGroup,
} from "./lib/env-ready.js";

type WizardStep =
  | "loading"
  | "required"
  | "optionalGroups"
  | "optionalValues"
  | "confirmOverwrite"
  | "writing"
  | "done"
  | "error";

const REQUIRED_KEYS = [
  "PROJECT_URL",
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_APP_NAME",
  "BETTER_AUTH_SECRET",
  "BETTER_AUTH_URL",
  "DATABASE_URL",
  "POLAR_ACCESS_TOKEN",
  "POLAR_WEBHOOK_SECRET",
  "POLAR_ORGANIZATION_ID",
  "RESEND_API_KEY",
];

const OPTIONAL_GROUPS: { value: OptionalGroup; label: string }[] = [
  { value: "github", label: "GitHub OAuth" },
  { value: "twitter", label: "Twitter/X OAuth" },
  { value: "walletConnect", label: "WalletConnect" },
  { value: "analytics", label: "Analytics" },
  { value: "fileUploads", label: "File Uploads (DigitalOcean)" },
  { value: "emailBranding", label: "Email Branding" },
  { value: "support", label: "Support Email" },
  { value: "landingMode", label: "Landing Mode" },
];

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

export interface ReadyWizardProps {
  projectDir: string;
  onComplete?: () => void;
}

export function ReadyWizard({ projectDir, onComplete }: ReadyWizardProps) {
  const [step, setStep] = useState<WizardStep>("loading");
  const [error, setError] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [requiredIndex, setRequiredIndex] = useState(0);
  const [optionalGroups, setOptionalGroups] = useState<OptionalGroup[]>([]);
  const [optionalGroupIndex, setOptionalGroupIndex] = useState(0);
  const [optionalKeyIndex, setOptionalKeyIndex] = useState(0);
  const [exampleContent, setExampleContent] = useState("");

  const loadEnv = useCallback(() => {
    try {
      const { exampleContent: ex, envValues } = readProjectEnv(projectDir);
      setExampleContent(ex);

      const defaults: Record<string, string> = {};
      for (const key of REQUIRED_KEYS) {
        defaults[key] = envValues[key] ?? "";
      }
      for (const group of Object.keys(OPTIONAL_GROUP_KEYS) as OptionalGroup[]) {
        for (const key of OPTIONAL_GROUP_KEYS[group]) {
          defaults[key] = envValues[key] ?? "";
        }
      }

      setValues(defaults);
      setOptionalGroups(detectEnabledGroups(envValues, ex));
      setStep("required");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStep("error");
    }
  }, [projectDir]);

  useMemo(() => {
    if (step === "loading") {
      loadEnv();
    }
  }, [step, loadEnv]);

  const currentRequiredKey = REQUIRED_KEYS[requiredIndex];
  const currentOptionalGroup = optionalGroups[optionalGroupIndex];
  const currentOptionalKeys = currentOptionalGroup ? OPTIONAL_GROUP_KEYS[currentOptionalGroup] : [];
  const currentOptionalKey = currentOptionalKeys[optionalKeyIndex];

  const handleRequiredSubmit = (value: string) => {
    setValues((prev) => ({ ...prev, [currentRequiredKey]: value }));
    if (requiredIndex + 1 < REQUIRED_KEYS.length) {
      setRequiredIndex((i) => i + 1);
    } else {
      setStep("optionalGroups");
    }
  };

  const handleOptionalGroupsSubmit = (selected: string[]) => {
    setOptionalGroups(selected as OptionalGroup[]);
    setOptionalGroupIndex(0);
    setOptionalKeyIndex(0);
    if (selected.length === 0) {
      setStep("confirmOverwrite");
    } else {
      setStep("optionalValues");
    }
  };

  const handleOptionalValueSubmit = (value: string) => {
    if (!currentOptionalKey) return;
    setValues((prev) => ({ ...prev, [currentOptionalKey]: value }));

    if (optionalKeyIndex + 1 < currentOptionalKeys.length) {
      setOptionalKeyIndex((i) => i + 1);
    } else if (optionalGroupIndex + 1 < optionalGroups.length) {
      setOptionalGroupIndex((i) => i + 1);
      setOptionalKeyIndex(0);
    } else {
      setStep("confirmOverwrite");
    }
  };

  const handleConfirmOverwrite = (confirmed: boolean) => {
    if (!confirmed) {
      setError("Aborted. .env.production was not written.");
      setStep("error");
      return;
    }
    setStep("writing");

    try {
      const content = generateProductionEnv({ exampleContent, values });
      writeProductionEnv({ projectDir, content, overwrite: true });
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
      {step === "loading" && <StatusMessage status="info">Loading project environment...</StatusMessage>}
      {step === "required" && currentRequiredKey && (
        <TextInput
          label={`${currentRequiredKey} (required)`}
          value={values[currentRequiredKey] ?? ""}
          onChange={(v) => setValues((prev) => ({ ...prev, [currentRequiredKey]: v }))}
          onSubmit={handleRequiredSubmit}
          placeholder={values[currentRequiredKey] ?? ""}
        />
      )}
      {step === "optionalGroups" && (
        <MultiSelect
          label="Select optional integrations to configure"
          items={OPTIONAL_GROUPS}
          onSubmit={handleOptionalGroupsSubmit}
          initialSelected={optionalGroups}
        />
      )}
      {step === "optionalValues" && currentOptionalKey && (
        <TextInput
          label={`${currentOptionalKey} (${currentOptionalGroup})`}
          value={values[currentOptionalKey] ?? ""}
          onChange={(v) => setValues((prev) => ({ ...prev, [currentOptionalKey]: v }))}
          onSubmit={handleOptionalValueSubmit}
          placeholder={values[currentOptionalKey] ?? ""}
        />
      )}
      {step === "confirmOverwrite" && (
        <Box flexDirection="column">
          <Text>Write production environment to .env.production?</Text>
          <Confirm label="Write .env.production" onConfirm={handleConfirmOverwrite} defaultValue={true} />
        </Box>
      )}
      {step === "writing" && <StatusMessage status="info">Writing .env.production...</StatusMessage>}
      {step === "done" && (
        <StatusMessage status="success">.env.production written for {projectDir}</StatusMessage>
      )}
      {step === "error" && <StatusMessage status="error">{error}</StatusMessage>}
    </Box>
  );
}
