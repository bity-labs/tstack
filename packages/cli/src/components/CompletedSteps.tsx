import { Box } from "ink";
import React from "react";

import { StatusMessage } from "./StatusMessage.js";

export interface CompletedStepsConfig {
  project?: { name: string };
  oauth?: {
    github?: unknown;
    twitter?: unknown;
  };
  web3?: { enabled?: boolean };
  payment?: { enabled?: boolean };
  storage?: { enabled?: boolean };
  analytics?: { enabled?: boolean; provider?: string };
  git?: { initialized?: boolean };
  install?: { completed?: boolean };
}

export interface CompletedStepsProps {
  config: CompletedStepsConfig;
  currentStep: string;
}

const stepOrder = [
  "project",
  "scaffold",
  "oauth",
  "payment",
  "storage",
  "analytics",
  "env",
  "git",
  "install",
  "brand",
  "complete",
] as const;

export function CompletedSteps({ config, currentStep }: CompletedStepsProps) {
  const currentIndex = stepOrder.indexOf(currentStep as (typeof stepOrder)[number]);

  if (currentIndex <= 0) {
    return null;
  }

  return (
    <Box flexDirection="column" marginBottom={1}>
      {currentIndex > 0 && config.project ? (
        <StatusMessage status="success">Project: {config.project.name}</StatusMessage>
      ) : null}

      {currentIndex > 1 && config.project ? (
        <StatusMessage status="success">Created app: {config.project.name}/</StatusMessage>
      ) : null}

      {currentIndex > 2 ? (
        <>
          <StatusMessage status={config.oauth?.github ? "success" : "skip"}>
            GitHub OAuth: {config.oauth?.github ? "Configured" : "Skipped"}
          </StatusMessage>
          <StatusMessage status={config.oauth?.twitter ? "success" : "skip"}>
            Twitter/X OAuth: {config.oauth?.twitter ? "Configured" : "Skipped"}
          </StatusMessage>
          <StatusMessage status={config.web3?.enabled ? "success" : "skip"}>
            Web3 (WalletConnect): {config.web3?.enabled ? "Configured" : "Skipped"}
          </StatusMessage>
        </>
      ) : null}

      {currentIndex > 3 ? (
        <StatusMessage status={config.payment?.enabled ? "success" : "skip"}>
          Payment (Polar): {config.payment?.enabled ? "Configured" : "Skipped"}
        </StatusMessage>
      ) : null}

      {currentIndex > 4 ? (
        <StatusMessage status={config.storage?.enabled ? "success" : "skip"}>
          Storage (DigitalOcean Spaces): {config.storage?.enabled ? "Configured" : "Skipped"}
        </StatusMessage>
      ) : null}

      {currentIndex > 5 ? (
        <StatusMessage status={config.analytics?.enabled ? "success" : "skip"}>
          Analytics: {config.analytics?.enabled ? config.analytics.provider : "Skipped"}
        </StatusMessage>
      ) : null}

      {currentIndex > 6 ? (
        <StatusMessage status="success">Environment configured</StatusMessage>
      ) : null}

      {currentIndex > 7 ? (
        <StatusMessage status={config.git?.initialized ? "success" : "skip"}>
          Git repository: {config.git?.initialized ? "Initialized" : "Skipped"}
        </StatusMessage>
      ) : null}

      {currentIndex > 8 ? (
        <StatusMessage status={config.install?.completed ? "success" : "skip"}>
          Dependencies: {config.install?.completed ? "Installed" : "Skipped"}
        </StatusMessage>
      ) : null}
    </Box>
  );
}
