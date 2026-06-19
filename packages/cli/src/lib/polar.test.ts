import { describe, expect, it, vi } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  loadPolarCredentials,
  createPolarClient,
  convertToPolarProduct,
  syncProductToPolar,
  checkSyncStatus,
  archivePolarProduct,
  unarchivePolarProduct,
  listActivePolarProducts,
  toBuyerMessage,
  type SyncResult,
  type TStackProduct,
} from "./polar.js";

const mockPolarConstructor = vi.fn();

vi.mock("@polar-sh/sdk", () => ({
  Polar: class MockPolar {
    constructor(...args: unknown[]) {
      mockPolarConstructor(...args);
    }
  },
}));

function makeTempDir(prefix: string): string {
  return mkdtempSync(join(tmpdir(), prefix));
}

describe("loadPolarCredentials", () => {
  it("returns token from override when provided", () => {
    const dir = makeTempDir("tstack-polar-");
    try {
      const result = loadPolarCredentials(dir, "override-token");
      expect(result).toEqual({ token: "override-token" });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("reads token from .env.local when override is not provided", () => {
    const dir = makeTempDir("tstack-polar-env-");
    try {
      writeFileSync(join(dir, ".env.local"), "POLAR_ACCESS_TOKEN=local-token\n");
      const result = loadPolarCredentials(dir);
      expect(result).toEqual({ token: "local-token" });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("falls back to .env when .env.local is missing", () => {
    const dir = makeTempDir("tstack-polar-env2-");
    try {
      writeFileSync(join(dir, ".env"), "POLAR_ACCESS_TOKEN=env-token\n");
      const result = loadPolarCredentials(dir);
      expect(result).toEqual({ token: "env-token" });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("prefers .env.local over .env", () => {
    const dir = makeTempDir("tstack-polar-env3-");
    try {
      writeFileSync(join(dir, ".env.local"), "POLAR_ACCESS_TOKEN=local-token\n");
      writeFileSync(join(dir, ".env"), "POLAR_ACCESS_TOKEN=env-token\n");
      const result = loadPolarCredentials(dir);
      expect(result).toEqual({ token: "local-token" });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("returns null when no token is found", () => {
    const dir = makeTempDir("tstack-polar-empty-");
    try {
      const result = loadPolarCredentials(dir);
      expect(result).toBeNull();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("ignores commented-out env lines", () => {
    const dir = makeTempDir("tstack-polar-commented-");
    try {
      writeFileSync(join(dir, ".env"), "# POLAR_ACCESS_TOKEN=commented-token\nPOLAR_ACCESS_TOKEN=real-token\n");
      const result = loadPolarCredentials(dir);
      expect(result).toEqual({ token: "real-token" });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("createPolarClient", () => {
  it("instantiates Polar with sandbox server", () => {
    createPolarClient({ token: "test-token" }, "sandbox");
    expect(mockPolarConstructor).toHaveBeenCalledWith({
      accessToken: "test-token",
      server: "sandbox",
    });
  });

  it("instantiates Polar with production server", () => {
    createPolarClient({ token: "test-token" }, "production");
    expect(mockPolarConstructor).toHaveBeenCalledWith({
      accessToken: "test-token",
      server: "production",
    });
  });
});

describe("convertToPolarProduct", () => {
  it("converts a monthly subscription to Polar recurring product", () => {
    const product: TStackProduct = {
      slug: "pro-monthly",
      name: "Pro Monthly",
      description: "Full access",
      type: "subscription",
      recurringInterval: "month",
      recurringIntervalCount: 1,
      prices: [{ amountType: "fixed", amount: 1900, currency: "usd" }],
      display: {
        title: "Pro",
        features: ["Unlimited projects"],
        badge: null,
        highlighted: false,
        cta: "Get Started",
      },
      polarProductId: null,
    };

    const polar = convertToPolarProduct(product);
    expect(polar.name).toBe("Pro Monthly");
    expect(polar.description).toBe("Full access");
    expect("recurringInterval" in polar ? polar.recurringInterval : undefined).toBe("month");
    expect(polar.prices).toHaveLength(1);
    expect(polar.prices[0]).toMatchObject({ amountType: "fixed", priceAmount: 1900, priceCurrency: "usd" });
    expect(polar.metadata).toMatchObject({ source: "tstack-cli" });
  });

  it("converts a one-time product to Polar one-time product", () => {
    const product: TStackProduct = {
      slug: "lifetime",
      name: "Lifetime",
      type: "one_time",
      prices: [{ amountType: "fixed", amount: 29900, currency: "usd" }],
      display: {
        title: "Lifetime",
        features: ["Forever access"],
        badge: null,
        highlighted: false,
        cta: "Buy Now",
      },
      polarProductId: null,
    };

    const polar = convertToPolarProduct(product);
    expect(polar.name).toBe("Lifetime");
    expect("recurringInterval" in polar ? polar.recurringInterval : undefined).toBeNull();
    expect(polar.prices[0]).toMatchObject({ amountType: "fixed", priceAmount: 29900 });
    expect(polar.metadata).toMatchObject({ source: "tstack-cli" });
  });

  it("converts a free product to Polar free product", () => {
    const product: TStackProduct = {
      slug: "free-tier",
      name: "Free Tier",
      type: "free",
      prices: [{ amountType: "free" }],
      display: {
        title: "Free",
        features: ["Basic features"],
        badge: null,
        highlighted: false,
        cta: "Start Free",
      },
      polarProductId: null,
    };

    const polar = convertToPolarProduct(product);
    expect(polar.name).toBe("Free Tier");
    expect(polar.prices[0]).toMatchObject({ amountType: "free" });
    expect(polar.metadata).toMatchObject({ source: "tstack-cli" });
  });
});

describe("syncProductToPolar", () => {
  it("creates a new product when polarProductId is missing", async () => {
    const createMock = vi.fn().mockResolvedValue({ id: "polar-new-id" });
    const client = {
      products: {
        create: createMock,
        update: vi.fn(),
      },
    } as unknown as import("@polar-sh/sdk").Polar;

    const product: TStackProduct = {
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
    };

    const result = await syncProductToPolar(client, product);
    expect(createMock).toHaveBeenCalled();
    expect(result.polarProductId).toBe("polar-new-id");
  });

  it("updates an existing product when polarProductId is present", async () => {
    const updateMock = vi.fn().mockResolvedValue({ id: "existing-id" });
    const client = {
      products: {
        create: vi.fn(),
        update: updateMock,
      },
    } as unknown as import("@polar-sh/sdk").Polar;

    const product: TStackProduct = {
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
      polarProductId: "existing-id",
    };

    const result = await syncProductToPolar(client, product);
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: "existing-id" }),
    );
    expect(result.polarProductId).toBe("existing-id");
  });

  it("creates a replacement product when the stored polarProductId no longer exists", async () => {
    const createMock = vi.fn().mockResolvedValue({ id: "replacement-id" });
    const updateMock = vi.fn().mockRejectedValue({ name: "ResourceNotFound", message: "Not found" });
    const client = {
      products: {
        create: createMock,
        update: updateMock,
      },
    } as unknown as import("@polar-sh/sdk").Polar;

    const product: TStackProduct = {
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
      polarProductId: "stale-id",
    };

    const result = await syncProductToPolar(client, product);

    expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({ id: "stale-id" }));
    expect(createMock).toHaveBeenCalled();
    expect(result.polarProductId).toBe("replacement-id");
  });
});

describe("checkSyncStatus", () => {
  it("returns synced when product exists and is not archived", async () => {
    const client = {
      products: {
        get: vi.fn().mockResolvedValue({ id: "p1", isArchived: false }),
      },
    } as unknown as import("@polar-sh/sdk").Polar;

    const product: TStackProduct = {
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
    };

    const status = await checkSyncStatus(client, product);
    expect(status).toBe("synced");
  });

  it("returns archived when product is archived on Polar", async () => {
    const client = {
      products: {
        get: vi.fn().mockResolvedValue({ id: "p1", isArchived: true }),
      },
    } as unknown as import("@polar-sh/sdk").Polar;

    const product: TStackProduct = {
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
    };

    const status = await checkSyncStatus(client, product);
    expect(status).toBe("archived");
  });

  it("returns not-synced when polarProductId is null", async () => {
    const client = {
      products: { get: vi.fn() },
    } as unknown as import("@polar-sh/sdk").Polar;

    const product: TStackProduct = {
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
    };

    const status = await checkSyncStatus(client, product);
    expect(status).toBe("not-synced");
    expect(client.products.get).not.toHaveBeenCalled();
  });

  it("returns not-synced when the stored polarProductId no longer exists", async () => {
    const client = {
      products: {
        get: vi.fn().mockRejectedValue({ name: "ResourceNotFound", message: "Not found" }),
      },
    } as unknown as import("@polar-sh/sdk").Polar;

    const product: TStackProduct = {
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
      polarProductId: "stale-id",
    };

    const status = await checkSyncStatus(client, product);
    expect(status).toBe("not-synced");
  });

  it("returns error when product lookup fails", async () => {
    const client = {
      products: {
        get: vi.fn().mockRejectedValue(new Error("network error")),
      },
    } as unknown as import("@polar-sh/sdk").Polar;

    const product: TStackProduct = {
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
    };

    const status = await checkSyncStatus(client, product);
    expect(status).toBe("error");
  });
});

describe("archivePolarProduct", () => {
  it("archives a product on Polar", async () => {
    const updateMock = vi.fn().mockResolvedValue({ id: "p1" });
    const client = {
      products: { update: updateMock },
    } as unknown as import("@polar-sh/sdk").Polar;

    await archivePolarProduct(client, "p1");
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: "p1", productUpdate: { isArchived: true } }),
    );
  });

  it("throws when archive fails", async () => {
    const updateMock = vi.fn().mockRejectedValue(new Error("network error"));
    const client = {
      products: { update: updateMock },
    } as unknown as import("@polar-sh/sdk").Polar;

    await expect(archivePolarProduct(client, "p1")).rejects.toThrow("network error");
  });
});

describe("unarchivePolarProduct", () => {
  it("unarchives a product on Polar", async () => {
    const updateMock = vi.fn().mockResolvedValue({ id: "p1" });
    const client = {
      products: { update: updateMock },
    } as unknown as import("@polar-sh/sdk").Polar;

    await unarchivePolarProduct(client, "p1");
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: "p1", productUpdate: { isArchived: false } }),
    );
  });

  it("throws when unarchive fails", async () => {
    const updateMock = vi.fn().mockRejectedValue(new Error("network error"));
    const client = {
      products: { update: updateMock },
    } as unknown as import("@polar-sh/sdk").Polar;

    await expect(unarchivePolarProduct(client, "p1")).rejects.toThrow("network error");
  });
});

describe("listActivePolarProducts", () => {
  it("lists active Polar products with metadata", async () => {
    const items = [
      { id: "p1", name: "Pro", metadata: { source: "tstack-cli" } },
      { id: "p2", name: "Basic", metadata: { source: "tstack-cli" } },
    ];

    const page = {
      result: { items, pagination: { totalCount: 2, maxPage: 1 } },
      next: vi.fn().mockResolvedValue(null),
      [Symbol.asyncIterator]: async function* () {
        yield { result: { items, pagination: { totalCount: 2, maxPage: 1 } } };
      },
    };

    const client = {
      products: {
        list: vi.fn().mockResolvedValue(page),
      },
    } as unknown as import("@polar-sh/sdk").Polar;

    const result = await listActivePolarProducts(client);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ id: "p1", name: "Pro" });
  });

  it("filters out products without tstack-cli metadata", async () => {
    const items = [
      { id: "p1", name: "Pro", metadata: { source: "tstack-cli" } },
      { id: "p2", name: "Other", metadata: {} },
    ];

    const page = {
      result: { items, pagination: { totalCount: 2, maxPage: 1 } },
      next: vi.fn().mockResolvedValue(null),
      [Symbol.asyncIterator]: async function* () {
        yield { result: { items, pagination: { totalCount: 2, maxPage: 1 } } };
      },
    };

    const client = {
      products: {
        list: vi.fn().mockResolvedValue(page),
      },
    } as unknown as import("@polar-sh/sdk").Polar;

    const result = await listActivePolarProducts(client);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("p1");
  });

  it("iterates across multiple pages", async () => {
    const page1Items = [{ id: "p1", name: "Pro", metadata: { source: "tstack-cli" } }];
    const page2Items = [{ id: "p2", name: "Basic", metadata: { source: "tstack-cli" } }];

    let callCount = 0;
    const page = {
      result: { items: page1Items, pagination: { totalCount: 2, maxPage: 2 } },
      next: vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            result: { items: page2Items, pagination: { totalCount: 2, maxPage: 2 } },
            next: vi.fn().mockResolvedValue(null),
            [Symbol.asyncIterator]: async function* () {
              yield { result: { items: page2Items, pagination: { totalCount: 2, maxPage: 2 } } };
            },
          });
        }
        return Promise.resolve(null);
      }),
      [Symbol.asyncIterator]: async function* () {
        yield { result: { items: page1Items, pagination: { totalCount: 2, maxPage: 2 } } };
        yield { result: { items: page2Items, pagination: { totalCount: 2, maxPage: 2 } } };
      },
    };

    const client = {
      products: {
        list: vi.fn().mockResolvedValue(page),
      },
    } as unknown as import("@polar-sh/sdk").Polar;

    const result = await listActivePolarProducts(client);
    expect(result).toHaveLength(2);
    expect(result[1].id).toBe("p2");
  });
});

describe("toBuyerMessage", () => {
  it("returns a readable message for ResourceNotFound errors", () => {
    const error = { name: "ResourceNotFound", message: "Product not found" };
    expect(toBuyerMessage(error)).toContain("not found");
  });

  it("returns a readable message for HTTPValidationError", () => {
    const error = { name: "HTTPValidationError", message: "Invalid price amount" };
    expect(toBuyerMessage(error)).toContain("Invalid");
  });

  it("returns the error message for generic errors", () => {
    expect(toBuyerMessage(new Error("Something went wrong"))).toBe("Something went wrong");
  });

  it("returns a fallback for unknown errors", () => {
    expect(toBuyerMessage(null)).toBe("An unexpected error occurred.");
    expect(toBuyerMessage(undefined)).toBe("An unexpected error occurred.");
  });
});
