import { render } from "ink-testing-library";
import React from "react";
import { describe, expect, it } from "vitest";

import {
  CompletedSteps,
  Confirm,
  ErrorRecovery,
  Header,
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

function renderFrame(element: React.ReactElement): string {
  return render(element).lastFrame() ?? "";
}

describe("CLI component rendering", () => {
  it("renders text input labels, values, placeholders, and errors", () => {
    expect(
      renderFrame(
        React.createElement(TextInput, {
          label: "Name",
          value: "my-app",
          onChange: () => {},
          placeholder: "Enter name",
          error: "Name is required",
        }),
      ),
    ).toContain("Name:");
    expect(
      renderFrame(
        React.createElement(TextInput, {
          label: "Name",
          value: "my-app",
          onChange: () => {},
          placeholder: "Enter name",
          error: "Name is required",
        }),
      ),
    ).toContain("my-app");
    expect(
      renderFrame(
        React.createElement(TextInput, {
          label: "Name",
          value: "",
          onChange: () => {},
          placeholder: "Enter name",
        }),
      ),
    ).toContain("Enter name");
    expect(
      renderFrame(
        React.createElement(TextInput, {
          label: "Name",
          value: "",
          onChange: () => {},
          error: "Name is required",
        }),
      ),
    ).toContain("✗ Name is required");
  });

  it("renders confirmation choices with the selected default emphasized", () => {
    expect(renderFrame(React.createElement(Confirm, { label: "Continue?", onConfirm: () => {} }))).toContain(
      "[N]o",
    );
    expect(
      renderFrame(React.createElement(Confirm, { label: "Continue?", onConfirm: () => {}, defaultValue: true })),
    ).toContain("[Y]es");
  });

  it("renders select options", () => {
    const frame = renderFrame(
      React.createElement(Select, {
        label: "Choose environment",
        options: [
          { label: "Sandbox", value: "sandbox" },
          { label: "Production", value: "production" },
        ],
        onSelect: () => {},
      }),
    );

    expect(frame).toContain("Choose environment");
    expect(frame).toContain("Sandbox");
    expect(frame).toContain("Production");
  });

  it("renders multi-select instructions and selected counts", () => {
    const frame = renderFrame(
      React.createElement(MultiSelect, {
        label: "Choose providers",
        items: [
          { label: "GitHub OAuth", value: "github" },
          { label: "Polar", value: "polar" },
        ],
        onSubmit: () => {},
        initialSelected: ["github"],
      }),
    );

    expect(frame).toContain("Choose providers");
    expect(frame).toContain("space toggle");
    expect(frame).toContain("Selected: 1 item");
    expect(frame).toContain("◉");
  });

  it("renders spinner labels", () => {
    expect(renderFrame(React.createElement(Spinner, { label: "Installing dependencies" }))).toContain(
      "Installing dependencies",
    );
  });

  it.each([
    ["success", "✓", "Done"],
    ["error", "✗", "Failed"],
    ["skip", "○", "Skipped"],
    ["info", "→", "Working"],
  ] as const)("renders %s status messages", (status, icon, copy) => {
    expect(renderFrame(React.createElement(StatusMessage, { status, children: copy }))).toContain(`${icon} ${copy}`);
  });

  it("renders section headers with optional subtitles", () => {
    const frame = renderFrame(React.createElement(SectionHeader, { title: "Project setup", subtitle: "TStack" }));

    expect(frame).toContain("Project setup");
    expect(frame).toContain("TStack");
  });

  it("renders the branded TStack header", () => {
    const frame = renderFrame(React.createElement(Header));

    expect(frame).toContain("TStack");
    expect(frame).toContain("Scaffold your next TStack project");
  });

  it("renders completed setup step summaries", () => {
    const frame = renderFrame(
      React.createElement(CompletedSteps, {
        config: {
          project: { name: "my-app" },
          oauth: { github: { clientId: "id" } },
          web3: { enabled: false },
          payment: { enabled: true },
          storage: { enabled: false },
          analytics: { enabled: true, provider: "posthog" },
        },
        currentStep: "env",
      }),
    );

    expect(frame).toContain("Project: my-app");
    expect(frame).toContain("GitHub OAuth: Configured");
    expect(frame).toContain("Twitter/X OAuth: Skipped");
    expect(frame).toContain("Payment (Polar): Configured");
    expect(frame).toContain("Storage (DigitalOcean Spaces): Skipped");
    expect(frame).toContain("Analytics: posthog");
  });

  it("renders product lists with prices and sync status placeholders", () => {
    const frame = renderFrame(
      React.createElement(ProductList, {
        products: [
          {
            slug: "pro-monthly",
            name: "Pro Monthly",
            type: "subscription",
            recurringInterval: "month",
            prices: [{ amountType: "fixed", amount: 1999, currency: "usd" }],
          },
          {
            slug: "free",
            name: "Free",
            type: "free",
            prices: [{ amountType: "free" }],
          },
        ],
        syncStatus: new Map<string, SyncStatus>([
          ["pro-monthly", "synced"],
          ["free", "archived"],
        ]),
      }),
    );

    expect(frame).toContain("✓");
    expect(frame).toContain("Pro Monthly (pro-monthly) - $19.99/month");
    expect(frame).toContain("Free (free) - Free");
    expect(frame).toContain("[archived]");
  });

  it("renders product empty states", () => {
    expect(renderFrame(React.createElement(ProductList, { products: [], syncStatus: new Map() }))).toContain(
      "No products found",
    );
  });

  it("renders product operation menus for empty and populated projects", () => {
    const emptyFrame = renderFrame(React.createElement(OperationMenu, { hasProducts: false, onSelect: () => {} }));
    const populatedFrame = renderFrame(
      React.createElement(OperationMenu, { hasProducts: true, hasArchivedProducts: true, onSelect: () => {} }),
    );

    expect(emptyFrame).toContain("No products found");
    expect(emptyFrame).toContain("Add new product");
    expect(emptyFrame).not.toContain("Remove products");
    expect(populatedFrame).toContain("Remove products");
    expect(populatedFrame).toContain("Sync products to Polar");
    expect(populatedFrame).toContain("Unarchive products on Polar");
    expect(populatedFrame).toContain("Regenerate TypeScript exports");
  });

  it("renders retry-focused error recovery UI", () => {
    const frame = renderFrame(
      React.createElement(ErrorRecovery, {
        error: "Copy failed",
        context: "Check file permissions",
        onRetry: () => {},
      }),
    );

    expect(frame).toContain("✗ Copy failed");
    expect(frame).toContain("Check file permissions");
    expect(frame).toContain("[R]etry");
    expect(frame).toContain("[e]xit");
  });
});
