import { describe, expect, it, vi, beforeEach } from "vitest";
import { mkdtempSync, writeFileSync, rmSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  removeProducts,
  unarchiveProducts,
  findOrphanProducts,
  archiveOrphanProducts,
  importOrphanProducts,
  syncSandboxToProduction,
  type OperationResult,
} from "./products-operations.js";

vi.mock("./polar.js", async () => {
  const actual = await vi.importActual<typeof import("./polar.js")>("./polar.js");
  return {
    ...actual,
    archivePolarProduct: vi.fn(),
    unarchivePolarProduct: vi.fn(),
    listActivePolarProducts: vi.fn(),
    toBuyerMessage: vi.fn((err: unknown) => (err instanceof Error ? err.message : String(err))),
  };
});

import * as polar from "./polar.js";

function makeTempDir(prefix: string): string {
  return mkdtempSync(join(tmpdir(), prefix));
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("removeProducts", () => {
  it("removes local products and archives Polar products with IDs", async () => {
    const dir = makeTempDir("tstack-remove-");
    const productsFilePath = join(dir, "products.sandbox.json");

    try {
      writeFileSync(
        productsFilePath,
        JSON.stringify({
          $schema: "./products.schema.json",
          products: [
            {
              slug: "pro-monthly",
              name: "Pro Monthly",
              type: "subscription",
              recurringInterval: "month",
              prices: [{ amountType: "fixed", amount: 1900, currency: "usd" }],
              display: { title: "Pro", features: ["A"], badge: null, highlighted: false, cta: "Go" },
              polarProductId: "p1",
            },
            {
              slug: "free-tier",
              name: "Free Tier",
              type: "free",
              prices: [{ amountType: "free" }],
              display: { title: "Free", features: ["B"], badge: null, highlighted: false, cta: "Go" },
              polarProductId: null,
            },
          ],
        }),
      );

      const client = {} as import("@polar-sh/sdk").Polar;
      const regenerate = vi.fn();

      const results = await removeProducts({
        productsFilePath,
        slugsToRemove: ["pro-monthly"],
        client,
        regenerate,
      });

      expect(vi.mocked(polar.archivePolarProduct)).toHaveBeenCalledWith(client, "p1");
      expect(results).toEqual<OperationResult[]>([
        { slug: "pro-monthly", status: "success", message: "Removed" },
      ]);

      const remaining = JSON.parse(readFileSync(productsFilePath, "utf8")).products;
      expect(remaining).toHaveLength(1);
      expect(remaining[0].slug).toBe("free-tier");
      expect(regenerate).toHaveBeenCalled();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("removes products without Polar IDs without calling archive", async () => {
    const dir = makeTempDir("tstack-remove-no-id-");
    const productsFilePath = join(dir, "products.sandbox.json");

    try {
      writeFileSync(
        productsFilePath,
        JSON.stringify({
          $schema: "./products.schema.json",
          products: [
            {
              slug: "local-only",
              name: "Local Only",
              type: "free",
              prices: [{ amountType: "free" }],
              display: { title: "Local", features: [], badge: null, highlighted: false, cta: "Go" },
              polarProductId: null,
            },
          ],
        }),
      );

      const client = {} as import("@polar-sh/sdk").Polar;
      const regenerate = vi.fn();

      const results = await removeProducts({
        productsFilePath,
        slugsToRemove: ["local-only"],
        client,
        regenerate,
      });

      expect(vi.mocked(polar.archivePolarProduct)).not.toHaveBeenCalled();
      expect(results[0]).toMatchObject({ slug: "local-only", status: "success" });
      expect(existsSync(productsFilePath)).toBe(true);
      expect(JSON.parse(readFileSync(productsFilePath, "utf8")).products).toHaveLength(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("keeps local product when Polar archive fails and reports failure", async () => {
    const dir = makeTempDir("tstack-remove-fail-");
    const productsFilePath = join(dir, "products.sandbox.json");

    try {
      writeFileSync(
        productsFilePath,
        JSON.stringify({
          $schema: "./products.schema.json",
          products: [
            {
              slug: "pro-monthly",
              name: "Pro Monthly",
              type: "subscription",
              recurringInterval: "month",
              prices: [{ amountType: "fixed", amount: 1900, currency: "usd" }],
              display: { title: "Pro", features: ["A"], badge: null, highlighted: false, cta: "Go" },
              polarProductId: "p1",
            },
          ],
        }),
      );

      vi.mocked(polar.archivePolarProduct).mockRejectedValue(new Error("Polar error"));

      const client = {} as import("@polar-sh/sdk").Polar;
      const regenerate = vi.fn();

      const results = await removeProducts({
        productsFilePath,
        slugsToRemove: ["pro-monthly"],
        client,
        regenerate,
      });

      expect(results).toEqual<OperationResult[]>([
        { slug: "pro-monthly", status: "failure", message: "Polar error" },
      ]);

      const remaining = JSON.parse(readFileSync(productsFilePath, "utf8")).products;
      expect(remaining).toHaveLength(1);
      expect(remaining[0].slug).toBe("pro-monthly");
      expect(regenerate).not.toHaveBeenCalled();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("unarchiveProducts", () => {
  it("unarchives selected Polar products", async () => {
    const client = {} as import("@polar-sh/sdk").Polar;

    const results = await unarchiveProducts({
      idsToUnarchive: ["p1", "p2"],
      client,
    });

    expect(vi.mocked(polar.unarchivePolarProduct)).toHaveBeenCalledWith(client, "p1");
    expect(vi.mocked(polar.unarchivePolarProduct)).toHaveBeenCalledWith(client, "p2");
    expect(results).toEqual<OperationResult[]>([
      { slug: "p1", status: "success", message: "Unarchived" },
      { slug: "p2", status: "success", message: "Unarchived" },
    ]);
  });

  it("reports failures for individual unarchive errors", async () => {
    vi.mocked(polar.unarchivePolarProduct)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("Polar error"));

    const client = {} as import("@polar-sh/sdk").Polar;

    const results = await unarchiveProducts({
      idsToUnarchive: ["p1", "p2"],
      client,
    });

    expect(results).toEqual<OperationResult[]>([
      { slug: "p1", status: "success", message: "Unarchived" },
      { slug: "p2", status: "failure", message: "Polar error" },
    ]);
  });
});

describe("findOrphanProducts", () => {
  it("returns active Polar products not present in local JSON", async () => {
    vi.mocked(polar.listActivePolarProducts).mockResolvedValue([
      { id: "p1", name: "Orphan A" },
      { id: "p2", name: "Orphan B" },
      { id: "p3", name: "Existing" },
    ]);

    const client = {} as import("@polar-sh/sdk").Polar;
    const localProducts = [
      { slug: "existing", name: "Existing", polarProductId: "p3" },
    ] as import("./products.js").Product[];

    const orphans = await findOrphanProducts({ client, localProducts });

    expect(orphans).toHaveLength(2);
    expect(orphans[0].id).toBe("p1");
    expect(orphans[1].id).toBe("p2");
  });

  it("returns empty array when no orphans exist", async () => {
    vi.mocked(polar.listActivePolarProducts).mockResolvedValue([
      { id: "p1", name: "Existing" },
    ]);

    const client = {} as import("@polar-sh/sdk").Polar;
    const localProducts = [
      { slug: "existing", name: "Existing", polarProductId: "p1" },
    ] as import("./products.js").Product[];

    const orphans = await findOrphanProducts({ client, localProducts });
    expect(orphans).toHaveLength(0);
  });
});

describe("archiveOrphanProducts", () => {
  it("archives selected orphan products", async () => {
    const client = {} as import("@polar-sh/sdk").Polar;

    const results = await archiveOrphanProducts({
      orphanIds: ["o1", "o2"],
      client,
    });

    expect(vi.mocked(polar.archivePolarProduct)).toHaveBeenCalledWith(client, "o1");
    expect(vi.mocked(polar.archivePolarProduct)).toHaveBeenCalledWith(client, "o2");
    expect(results).toEqual<OperationResult[]>([
      { slug: "o1", status: "success", message: "Archived" },
      { slug: "o2", status: "success", message: "Archived" },
    ]);
  });

  it("reports mixed success and failure", async () => {
    vi.mocked(polar.archivePolarProduct)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("Polar error"));

    const client = {} as import("@polar-sh/sdk").Polar;

    const results = await archiveOrphanProducts({
      orphanIds: ["o1", "o2"],
      client,
    });

    expect(results).toEqual<OperationResult[]>([
      { slug: "o1", status: "success", message: "Archived" },
      { slug: "o2", status: "failure", message: "Polar error" },
    ]);
  });
});

describe("importOrphanProducts", () => {
  it("imports orphan Polar products into local JSON", () => {
    const dir = makeTempDir("tstack-import-");
    const productsFilePath = join(dir, "products.sandbox.json");

    try {
      writeFileSync(
        productsFilePath,
        JSON.stringify({
          $schema: "./products.schema.json",
          products: [],
        }),
      );

      const regenerate = vi.fn();

      const results = importOrphanProducts({
        productsFilePath,
        orphans: [{ id: "p1", name: "Orphan Product" }],
        regenerate,
      });

      expect(results[0]).toMatchObject({ slug: "orphan-product", status: "success" });

      const data = JSON.parse(readFileSync(productsFilePath, "utf8"));
      expect(data.products).toHaveLength(1);
      expect(data.products[0].slug).toBe("orphan-product");
      expect(data.products[0].polarProductId).toBe("p1");
      expect(regenerate).toHaveBeenCalled();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("handles slug conflicts by appending a counter", () => {
    const dir = makeTempDir("tstack-import-conflict-");
    const productsFilePath = join(dir, "products.sandbox.json");

    try {
      writeFileSync(
        productsFilePath,
        JSON.stringify({
          $schema: "./products.schema.json",
          products: [
            {
              slug: "orphan-product",
              name: "Orphan Product",
              type: "free",
              prices: [{ amountType: "free" }],
              display: { title: "Orphan", features: [], badge: null, highlighted: false, cta: "Go" },
            },
          ],
        }),
      );

      const regenerate = vi.fn();

      const results = importOrphanProducts({
        productsFilePath,
        orphans: [{ id: "p1", name: "Orphan Product" }],
        regenerate,
      });

      expect(results[0].slug).toBe("orphan-product-1");

      const data = JSON.parse(readFileSync(productsFilePath, "utf8"));
      expect(data.products).toHaveLength(2);
      expect(data.products[1].slug).toBe("orphan-product-1");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("syncSandboxToProduction", () => {
  it("creates production Polar products and writes production JSON", async () => {
    const dir = makeTempDir("tstack-sandbox-sync-");
    const productionProductsFilePath = join(dir, "products.production.json");

    try {
      const createMock = vi.fn().mockResolvedValue({ id: "prod-p1" });
      const client = {
        products: { create: createMock },
      } as unknown as import("@polar-sh/sdk").Polar;

      const regenerate = vi.fn();

      const sandboxProducts = [
        {
          slug: "pro-monthly",
          name: "Pro Monthly",
          type: "subscription" as const,
          recurringInterval: "month" as const,
          prices: [{ amountType: "fixed" as const, amount: 1900, currency: "usd" }],
          display: {
            title: "Pro",
            features: ["A"],
            badge: null,
            highlighted: false,
            cta: "Go",
          },
          polarProductId: "sandbox-p1",
        },
      ];

      const results = await syncSandboxToProduction({
        sandboxProducts,
        slugsToSync: ["pro-monthly"],
        productionClient: client,
        productionProductsFilePath,
        regenerate,
      });

      expect(createMock).toHaveBeenCalled();
      expect(results[0]).toMatchObject({ slug: "pro-monthly", status: "success" });

      const data = JSON.parse(readFileSync(productionProductsFilePath, "utf8"));
      expect(data.products).toHaveLength(1);
      expect(data.products[0].polarProductId).toBe("prod-p1");
      expect(regenerate).toHaveBeenCalled();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("updates existing production products by slug", async () => {
    const dir = makeTempDir("tstack-sandbox-sync-update-");
    const productionProductsFilePath = join(dir, "products.production.json");

    try {
      writeFileSync(
        productionProductsFilePath,
        JSON.stringify({
          $schema: "./products.schema.json",
          products: [
            {
              slug: "pro-monthly",
              name: "Old Name",
              type: "subscription",
              recurringInterval: "month",
              prices: [{ amountType: "fixed", amount: 1900, currency: "usd" }],
              display: { title: "Old", features: [], badge: null, highlighted: false, cta: "Go" },
              polarProductId: "old-id",
            },
          ],
        }),
      );

      const createMock = vi.fn().mockResolvedValue({ id: "prod-p1" });
      const client = {
        products: { create: createMock },
      } as unknown as import("@polar-sh/sdk").Polar;

      const regenerate = vi.fn();

      const sandboxProducts = [
        {
          slug: "pro-monthly",
          name: "Pro Monthly",
          type: "subscription" as const,
          recurringInterval: "month" as const,
          prices: [{ amountType: "fixed" as const, amount: 1900, currency: "usd" }],
          display: {
            title: "Pro",
            features: ["A"],
            badge: null,
            highlighted: false,
            cta: "Go",
          },
          polarProductId: "sandbox-p1",
        },
      ];

      await syncSandboxToProduction({
        sandboxProducts,
        slugsToSync: ["pro-monthly"],
        productionClient: client,
        productionProductsFilePath,
        regenerate,
      });

      const data = JSON.parse(readFileSync(productionProductsFilePath, "utf8"));
      expect(data.products).toHaveLength(1);
      expect(data.products[0].name).toBe("Pro Monthly");
      expect(data.products[0].polarProductId).toBe("prod-p1");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("reports failures without stopping other syncs", async () => {
    const dir = makeTempDir("tstack-sandbox-sync-mixed-");
    const productionProductsFilePath = join(dir, "products.production.json");

    try {
      const createMock = vi
        .fn()
        .mockResolvedValueOnce({ id: "prod-p1" })
        .mockRejectedValueOnce(new Error("Polar error"));
      const client = {
        products: { create: createMock },
      } as unknown as import("@polar-sh/sdk").Polar;

      const regenerate = vi.fn();

      const sandboxProducts = [
        {
          slug: "pro-monthly",
          name: "Pro Monthly",
          type: "subscription" as const,
          recurringInterval: "month" as const,
          prices: [{ amountType: "fixed" as const, amount: 1900, currency: "usd" }],
          display: {
            title: "Pro",
            features: ["A"],
            badge: null,
            highlighted: false,
            cta: "Go",
          },
          polarProductId: "sandbox-p1",
        },
        {
          slug: "pro-yearly",
          name: "Pro Yearly",
          type: "subscription" as const,
          recurringInterval: "year" as const,
          prices: [{ amountType: "fixed" as const, amount: 19000, currency: "usd" }],
          display: {
            title: "Pro",
            features: ["A"],
            badge: null,
            highlighted: false,
            cta: "Go",
          },
          polarProductId: "sandbox-p2",
        },
      ];

      const results = await syncSandboxToProduction({
        sandboxProducts,
        slugsToSync: ["pro-monthly", "pro-yearly"],
        productionClient: client,
        productionProductsFilePath,
        regenerate,
      });

      expect(results).toEqual<OperationResult[]>([
        { slug: "pro-monthly", status: "success", message: "Synced to production" },
        { slug: "pro-yearly", status: "failure", message: "Polar error" },
      ]);

      const data = JSON.parse(readFileSync(productionProductsFilePath, "utf8"));
      expect(data.products).toHaveLength(1);
      expect(data.products[0].slug).toBe("pro-monthly");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
