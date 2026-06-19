import { render } from "ink-testing-library";
import React from "react";
import { describe, expect, it } from "vitest";

import {
  CompletedSteps,
  Confirm,
  ErrorRecovery,
  MultiSelect,
  OperationMenu,
  ProductList,
  SectionHeader,
  Select,
  Spinner,
  StatusMessage,
  TextInput,
  type SyncStatus,
} from "./index.js";

describe("shared CLI primitives", () => {
  it("renders the prompt, status, product, operation, and recovery components needed by planned commands", () => {
    expect(
      render(
        React.createElement(TextInput, {
          label: "Project slug",
          value: "my-app",
          onChange: () => {},
        }),
      ).lastFrame(),
    ).toContain("Project slug:");

    expect(
      render(React.createElement(Confirm, { label: "Install dependencies?", onConfirm: () => {} }))
        .lastFrame(),
    ).toContain("Install dependencies?");

    expect(
      render(
        React.createElement(Select, {
          label: "Environment",
          options: [{ label: "Sandbox", value: "sandbox" }],
          onSelect: () => {},
        }),
      ).lastFrame(),
    ).toContain("Sandbox");

    expect(
      render(
        React.createElement(MultiSelect, {
          label: "Providers",
          items: [{ label: "GitHub OAuth", value: "github" }],
          onSubmit: () => {},
          initialSelected: ["github"],
        }),
      ).lastFrame(),
    ).toContain("Selected: 1 item");

    expect(render(React.createElement(Spinner, { label: "Copying boilerplate" })).lastFrame()).toContain(
      "Copying boilerplate",
    );

    expect(
      render(React.createElement(StatusMessage, { status: "success", children: "Ready" })).lastFrame(),
    ).toContain("✓ Ready");

    expect(
      render(React.createElement(SectionHeader, { title: "Project setup", subtitle: "TStack" })).lastFrame(),
    ).toContain("Project setup");

    expect(
      render(
        React.createElement(CompletedSteps, {
          config: { project: { name: "my-app" }, payment: { enabled: false } },
          currentStep: "storage",
        }),
      ).lastFrame(),
    ).toContain("Payment (Polar): Skipped");

    expect(
      render(
        React.createElement(ProductList, {
          products: [
            {
              slug: "pro-monthly",
              name: "Pro Monthly",
              type: "subscription",
              recurringInterval: "month",
              prices: [{ amountType: "fixed", amount: 1999, currency: "usd" }],
            },
          ],
          syncStatus: new Map<string, SyncStatus>([["pro-monthly", "not-synced"]]),
        }),
      ).lastFrame(),
    ).toContain("Pro Monthly (pro-monthly) - $19.99/month");

    expect(
      render(React.createElement(OperationMenu, { hasProducts: true, onSelect: () => {} })).lastFrame(),
    ).toContain("Regenerate TypeScript exports");

    expect(
      render(
        React.createElement(ErrorRecovery, {
          error: "Copy failed",
          context: "Check file permissions",
          onRetry: () => {},
        }),
      ).lastFrame(),
    ).toContain("Check file permissions");
  });
});
