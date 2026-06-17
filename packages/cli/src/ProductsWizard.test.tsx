import { describe, expect, it, vi } from "vitest";
import { render } from "ink-testing-library";
import React from "react";
import { mkdtempSync, writeFileSync, rmSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { ProductsWizard } from "./ProductsWizard.js";
import * as polar from "./lib/polar.js";
import * as productsOps from "./lib/products-operations.js";

vi.mock("./lib/products-operations.js", async () => {
  const actual = await vi.importActual<typeof import("./lib/products-operations.js")>("./lib/products-operations.js");
  return {
    ...actual,
    removeProducts: vi.fn(),
    unarchiveProducts: vi.fn(),
    findOrphanProducts: vi.fn(),
    archiveOrphanProducts: vi.fn(),
    importOrphanProducts: vi.fn(),
    syncSandboxToProduction: vi.fn(),
  };
});

vi.mock("./lib/polar.js", async () => {
  const actual = await vi.importActual<typeof import("./lib/polar.js")>("./lib/polar.js");
  return {
    ...actual,
    loadPolarCredentials: vi.fn(),
    createPolarClient: vi.fn(),
    syncProductToPolar: vi.fn(),
    checkSyncStatus: vi.fn(),
    archivePolarProduct: vi.fn(),
    unarchivePolarProduct: vi.fn(),
    listActivePolarProducts: vi.fn(),
    listArchivedPolarProducts: vi.fn(),
    toBuyerMessage: vi.fn((err: unknown) => (err instanceof Error ? err.message : String(err))),
  };
});

function makeTempDir(prefix: string): string {
  return mkdtempSync(join(tmpdir(), prefix));
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

describe("ProductsWizard", () => {
  it("renders loading state initially", () => {
    const { lastFrame } = render(
      <ProductsWizard projectDir="/tmp/test" env="sandbox" onComplete={() => {}} />,
    );
    expect(lastFrame()).toContain("Loading products...");
  });

  it("renders menu with empty state when no products file exists", () => {
    const dir = makeTempDir("tstack-products-empty-");

    try {
      const { frames } = render(
        <ProductsWizard projectDir={dir} env="sandbox" onComplete={() => {}} />,
      );

      const lastFrame = frames[frames.length - 1] ?? "";
      expect(lastFrame).toContain("No products found");
      expect(lastFrame).toContain("What would you like to do?");
      expect(lastFrame).toContain("Add new product");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("renders menu with products from sandbox JSON", async () => {
    const dir = makeTempDir("tstack-products-wizard-");
    const polarDir = join(dir, "polar");
    const productsFile = join(polarDir, "products.sandbox.json");

    try {
      mkdirSync(polarDir, { recursive: true });
      writeFileSync(
        productsFile,
        JSON.stringify({
          $schema: "./products.schema.json",
          products: [
            {
              slug: "pro-monthly",
              name: "Pro Monthly",
              type: "subscription",
              recurringInterval: "month",
              prices: [{ amountType: "fixed", amount: 1900, currency: "usd" }],
              display: {
                title: "Pro",
                features: ["Unlimited projects"],
                badge: null,
                highlighted: false,
                cta: "Get Started",
              },
            },
          ],
        }),
      );

      const { lastFrame } = render(
        <ProductsWizard projectDir={dir} env="sandbox" onComplete={() => {}} />,
      );

      // Wait for useEffect to load products
      await delay(50);

      const frame = lastFrame() ?? "";
      expect(frame).toContain("Pro Monthly");
      expect(frame).toContain("What would you like to do?");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("adds a free product interactively", async () => {
    const dir = makeTempDir("tstack-products-add-free-");
    const polarDir = join(dir, "polar");

    try {
      mkdirSync(polarDir, { recursive: true });

      const { stdin, lastFrame } = render(
        <ProductsWizard projectDir={dir} env="sandbox" onComplete={() => {}} />,
      );

      // Wait for loading → menu
      await delay(50);

      // Select "Add new product" (first option, just press return)
      stdin.write("\r");
      await delay(50);

      // Select "Free" type (third option: down, down, return)
      stdin.write("\u001B[B");
      await delay(20);
      stdin.write("\u001B[B");
      await delay(20);
      stdin.write("\r");
      await delay(50);

      // Enter product name
      stdin.write("Free Tier");
      await delay(20);
      stdin.write("\r");
      await delay(50);

      // Enter slug (accept placeholder)
      stdin.write("\r");
      await delay(50);

      // Enter display title
      stdin.write("\r");
      await delay(50);

      // Enter features
      stdin.write("Basic features");
      await delay(20);
      stdin.write("\r");
      await delay(50);

      // Enter CTA
      stdin.write("\r");
      await delay(50);

      // Confirm highlighted (default No)
      stdin.write("\r");
      await delay(50);

      // Confirm add (default Yes)
      stdin.write("\r");
      await delay(50);

      const frame = lastFrame() ?? "";
      expect(frame).toContain("Operation completed successfully");

      const productsFile = join(polarDir, "products.sandbox.json");
      expect(existsSync(productsFile)).toBe(true);
      const content = JSON.parse(readFileSync(productsFile, "utf8"));
      expect(content.products).toHaveLength(1);
      expect(content.products[0].slug).toBe("free-tier");
      expect(content.products[0].name).toBe("Free Tier");
      expect(content.products[0].type).toBe("free");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("adds a monthly subscription and offers yearly follow-up", async () => {
    const dir = makeTempDir("tstack-products-add-sub-");
    const polarDir = join(dir, "polar");

    try {
      mkdirSync(polarDir, { recursive: true });

      const { stdin, lastFrame } = render(
        <ProductsWizard projectDir={dir} env="sandbox" onComplete={() => {}} />,
      );

      await delay(50);

      // Select "Add new product"
      stdin.write("\r");
      await delay(50);

      // Select "Subscription" (first option)
      stdin.write("\r");
      await delay(50);

      // Enter name
      stdin.write("Pro Monthly");
      await delay(20);
      stdin.write("\r");
      await delay(50);

      // Enter slug
      stdin.write("\r");
      await delay(50);

      // Enter price
      stdin.write("19");
      await delay(20);
      stdin.write("\r");
      await delay(50);

      // Select "Month" interval (third option: down, down, return)
      stdin.write("\u001B[B");
      await delay(20);
      stdin.write("\u001B[B");
      await delay(20);
      stdin.write("\r");
      await delay(50);

      // Enter display title
      stdin.write("\r");
      await delay(50);

      // Enter features
      stdin.write("Unlimited projects");
      await delay(20);
      stdin.write("\r");
      await delay(50);

      // Enter CTA
      stdin.write("\r");
      await delay(50);

      // Confirm highlighted
      stdin.write("\r");
      await delay(50);

      // Confirm add (default Yes)
      stdin.write("\r");
      await delay(50);

      // Should offer yearly follow-up
      const yearlyFrame = lastFrame() ?? "";
      expect(yearlyFrame).toContain("yearly counterpart");
      expect(yearlyFrame).toContain("Pro Yearly");

      // Accept yearly follow-up (default Yes)
      stdin.write("\r");
      await delay(50);

      const frame = lastFrame() ?? "";
      expect(frame).toContain("Operation completed successfully");

      const productsFile = join(polarDir, "products.sandbox.json");
      const content = JSON.parse(readFileSync(productsFile, "utf8"));
      expect(content.products).toHaveLength(2);
      expect(content.products[0].slug).toBe("pro-monthly");
      expect(content.products[1].slug).toBe("pro-yearly");
      expect(content.products[1].recurringInterval).toBe("year");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("regenerates products.generated.ts from local JSON", async () => {
    const dir = makeTempDir("tstack-products-regen-");
    const polarDir = join(dir, "polar");
    const productsFile = join(polarDir, "products.sandbox.json");

    try {
      mkdirSync(polarDir, { recursive: true });
      writeFileSync(
        productsFile,
        JSON.stringify({
          $schema: "./products.schema.json",
          products: [
            {
              slug: "pro-monthly",
              name: "Pro Monthly",
              type: "subscription",
              recurringInterval: "month",
              prices: [{ amountType: "fixed", amount: 1900, currency: "usd" }],
              display: {
                title: "Pro",
                features: ["Unlimited projects"],
                badge: null,
                highlighted: false,
                cta: "Get Started",
              },
              polarProductId: "abc-123",
            },
          ],
        }),
      );

      const { stdin, lastFrame } = render(
        <ProductsWizard projectDir={dir} env="sandbox" onComplete={() => {}} />,
      );

      await delay(50);

      // Navigate to "Regenerate TypeScript exports" (down arrow to reach it)
      // In OperationMenu with products: Add, Remove, Sync, Unarchive, Cleanup, Regenerate
      // Regenerate is the 6th option, so 5 downs
      stdin.write("\u001B[B");
      await delay(20);
      stdin.write("\u001B[B");
      await delay(20);
      stdin.write("\u001B[B");
      await delay(20);
      stdin.write("\u001B[B");
      await delay(20);
      stdin.write("\u001B[B");
      await delay(20);
      stdin.write("\r");
      await delay(100);

      const frame = lastFrame() ?? "";
      expect(frame).toContain("Operation completed successfully");

      const generatedFile = join(dir, "src", "features", "billing", "generated", "products.generated.ts");
      expect(existsSync(generatedFile)).toBe(true);
      const content = readFileSync(generatedFile, "utf8");
      expect(content).toContain("Generated by tstack");
      expect(content).toContain('productId: "abc-123"');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("syncs products to Polar when token is provided", async () => {
    const dir = makeTempDir("tstack-products-sync-");
    const polarDir = join(dir, "polar");
    const productsFile = join(polarDir, "products.sandbox.json");

    try {
      mkdirSync(polarDir, { recursive: true });
      writeFileSync(
        productsFile,
        JSON.stringify({
          $schema: "./products.schema.json",
          products: [
            {
              slug: "pro-monthly",
              name: "Pro Monthly",
              type: "subscription",
              recurringInterval: "month",
              prices: [{ amountType: "fixed", amount: 1900, currency: "usd" }],
              display: {
                title: "Pro",
                features: ["Unlimited projects"],
                badge: null,
                highlighted: false,
                cta: "Get Started",
              },
              polarProductId: null,
            },
          ],
        }),
      );

      vi.mocked(polar.loadPolarCredentials).mockReturnValue({ token: "test-token" });
      vi.mocked(polar.createPolarClient).mockReturnValue({} as import("@polar-sh/sdk").Polar);
      vi.mocked(polar.checkSyncStatus).mockResolvedValue("not-synced");
      vi.mocked(polar.syncProductToPolar).mockResolvedValue({ polarProductId: "polar-new-id" });

      const { stdin, lastFrame } = render(
        <ProductsWizard projectDir={dir} env="sandbox" token="test-token" onComplete={() => {}} />,
      );

      await delay(50);

      // Navigate to "Sync products to Polar" (3rd option: down, down, return)
      stdin.write("\u001B[B");
      await delay(20);
      stdin.write("\u001B[B");
      await delay(20);
      stdin.write("\r");
      await delay(150);

      const frame = lastFrame() ?? "";
      expect(frame).toContain("Operation completed successfully");
      expect(polar.syncProductToPolar).toHaveBeenCalled();

      const content = JSON.parse(readFileSync(productsFile, "utf8"));
      expect(content.products[0].polarProductId).toBe("polar-new-id");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("prompts for Polar token when token is missing and products exist", async () => {
    const dir = makeTempDir("tstack-products-sync-prompt-");
    const polarDir = join(dir, "polar");
    const productsFile = join(polarDir, "products.sandbox.json");

    try {
      mkdirSync(polarDir, { recursive: true });
      writeFileSync(
        productsFile,
        JSON.stringify({
          $schema: "./products.schema.json",
          products: [
            {
              slug: "pro-monthly",
              name: "Pro Monthly",
              type: "subscription",
              recurringInterval: "month",
              prices: [{ amountType: "fixed", amount: 1900, currency: "usd" }],
              display: {
                title: "Pro",
                features: ["Unlimited projects"],
                badge: null,
                highlighted: false,
                cta: "Get Started",
              },
              polarProductId: null,
            },
          ],
        }),
      );

      vi.mocked(polar.loadPolarCredentials).mockReturnValue(null);

      const { stdin, lastFrame } = render(
        <ProductsWizard projectDir={dir} env="sandbox" onComplete={() => {}} />,
      );

      await delay(50);

      // Navigate to "Sync products to Polar" (3rd option: down, down, return)
      stdin.write("\u001B[B");
      await delay(20);
      stdin.write("\u001B[B");
      await delay(20);
      stdin.write("\r");
      await delay(50);

      const frame = lastFrame() ?? "";
      expect(frame).toContain("Polar access token");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("removes a product and archives it on Polar when ID exists", async () => {
    const dir = makeTempDir("tstack-products-remove-");
    const polarDir = join(dir, "polar");
    const productsFile = join(polarDir, "products.sandbox.json");

    try {
      mkdirSync(polarDir, { recursive: true });
      writeFileSync(
        productsFile,
        JSON.stringify({
          $schema: "./products.schema.json",
          products: [
            {
              slug: "pro-monthly",
              name: "Pro Monthly",
              type: "subscription",
              recurringInterval: "month",
              prices: [{ amountType: "fixed", amount: 1900, currency: "usd" }],
              display: {
                title: "Pro",
                features: ["Unlimited projects"],
                badge: null,
                highlighted: false,
                cta: "Get Started",
              },
              polarProductId: "p1",
            },
          ],
        }),
      );

      vi.mocked(polar.loadPolarCredentials).mockReturnValue({ token: "test-token" });
      vi.mocked(productsOps.removeProducts).mockResolvedValue([
        { slug: "pro-monthly", status: "success", message: "Removed" },
      ]);

      const { stdin, lastFrame } = render(
        <ProductsWizard projectDir={dir} env="sandbox" onComplete={() => {}} />,
      );

      await delay(50);

      // Select "Remove products" (2nd option: down, return)
      stdin.write("\u001B[B");
      await delay(20);
      stdin.write("\r");
      await delay(50);

      // MultiSelect: toggle the first item with space, then confirm with return
      stdin.write(" ");
      await delay(20);
      stdin.write("\r");
      await delay(100);

      const frame = lastFrame() ?? "";
      expect(frame).toContain("Operation completed successfully");
      expect(productsOps.removeProducts).toHaveBeenCalled();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("syncs sandbox products into production", async () => {
    const dir = makeTempDir("tstack-products-sandbox-sync-");
    const polarDir = join(dir, "polar");
    const sandboxFile = join(polarDir, "products.sandbox.json");
    const productionFile = join(polarDir, "products.production.json");

    try {
      mkdirSync(polarDir, { recursive: true });
      writeFileSync(
        sandboxFile,
        JSON.stringify({
          $schema: "./products.schema.json",
          products: [
            {
              slug: "pro-monthly",
              name: "Pro Monthly",
              type: "subscription",
              recurringInterval: "month",
              prices: [{ amountType: "fixed", amount: 1900, currency: "usd" }],
              display: {
                title: "Pro",
                features: ["Unlimited projects"],
                badge: null,
                highlighted: false,
                cta: "Get Started",
              },
              polarProductId: "sandbox-p1",
            },
          ],
        }),
      );

      vi.mocked(polar.loadPolarCredentials).mockReturnValue({ token: "test-token" });
      vi.mocked(productsOps.syncSandboxToProduction).mockResolvedValue([
        { slug: "pro-monthly", status: "success", message: "Synced to production" },
      ]);

      const { stdin, lastFrame } = render(
        <ProductsWizard projectDir={dir} env="production" onComplete={() => {}} />,
      );

      await delay(50);

      // Select "Sync products from sandbox" (first option when showSyncFromSandbox is true)
      stdin.write("\r");
      await delay(50);

      // MultiSelect: toggle the first item with space, then confirm with return
      stdin.write(" ");
      await delay(20);
      stdin.write("\r");
      await delay(100);

      const frame = lastFrame() ?? "";
      expect(frame).toContain("Operation completed successfully");
      expect(productsOps.syncSandboxToProduction).toHaveBeenCalled();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
