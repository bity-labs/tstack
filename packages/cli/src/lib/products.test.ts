import { describe, expect, it } from "vitest";
import { mkdtempSync, writeFileSync, rmSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  readProducts,
  writeProducts,
  validateProduct,
  formatPrice,
  generateYearlyProduct,
  generateProductsTypeScript,
  writeProductsGenerated,
} from "./products.js";

function makeTempDir(prefix: string): string {
  return mkdtempSync(join(tmpdir(), prefix));
}

describe("readProducts", () => {
  it("reads products from a JSON file with wrapper", () => {
    const dir = makeTempDir("tstack-products-");
    const filePath = join(dir, "products.sandbox.json");

    try {
      writeFileSync(
        filePath,
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

      const products = readProducts(filePath);
      expect(products).toHaveLength(1);
      expect(products[0].slug).toBe("pro-monthly");
      expect(products[0].name).toBe("Pro Monthly");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("writeProducts", () => {
  it("writes products to a JSON file preserving the wrapper", () => {
    const dir = makeTempDir("tstack-products-write-");
    const filePath = join(dir, "products.sandbox.json");

    try {
      writeFileSync(
        filePath,
        JSON.stringify({
          $schema: "./products.schema.json",
          products: [],
        }),
      );

      const products = [
        {
          slug: "pro-yearly",
          name: "Pro Yearly",
          type: "subscription" as const,
          recurringInterval: "year" as const,
          prices: [{ amountType: "fixed" as const, amount: 19000, currency: "usd" }],
          display: {
            title: "Pro",
            features: ["Unlimited projects"],
            badge: null,
            highlighted: true,
            cta: "Get Started",
          },
        },
      ];

      writeProducts(filePath, products);

      const raw = readFileSync(filePath, "utf8");
      const data = JSON.parse(raw);
      expect(data.$schema).toBe("./products.schema.json");
      expect(data.products).toHaveLength(1);
      expect(data.products[0].slug).toBe("pro-yearly");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("creates a new file with default schema when one does not exist", () => {
    const dir = makeTempDir("tstack-products-new-");
    const filePath = join(dir, "products.production.json");

    try {
      const products = [
        {
          slug: "lifetime",
          name: "Lifetime",
          type: "one_time" as const,
          prices: [{ amountType: "fixed" as const, amount: 29900, currency: "usd" }],
          display: {
            title: "Lifetime",
            features: ["Forever access"],
            badge: null,
            highlighted: false,
            cta: "Buy Now",
          },
        },
      ];

      writeProducts(filePath, products);

      const raw = readFileSync(filePath, "utf8");
      const data = JSON.parse(raw);
      expect(data.$schema).toBe("./products.schema.json");
      expect(data.products).toHaveLength(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("validateProduct", () => {
  const validProduct = {
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
  };

  it("returns no errors for a valid product", () => {
    expect(validateProduct(validProduct)).toEqual([]);
  });

  it("returns errors for missing required fields", () => {
    const product = { ...validProduct, slug: undefined };
    expect(validateProduct(product)).toContain("slug is required");
  });

  it("returns errors for invalid slug format", () => {
    const product = { ...validProduct, slug: "Pro Monthly" };
    expect(validateProduct(product)).toContain("slug must be kebab-case");
  });

  it("returns errors for invalid product type", () => {
    const product = { ...validProduct, type: "invalid" };
    expect(validateProduct(product)).toContain('type must be "subscription", "one_time", or "free"');
  });

  it("returns errors for subscription without recurringInterval", () => {
    const product = { ...validProduct, recurringInterval: undefined };
    expect(validateProduct(product)).toContain("recurringInterval is required for subscriptions");
  });

  it("returns errors for empty prices array", () => {
    const product = { ...validProduct, prices: [] };
    expect(validateProduct(product)).toContain("prices must have at least one entry");
  });

  it("returns errors for missing display title", () => {
    const product = { ...validProduct, display: { ...validProduct.display, title: "" } };
    expect(validateProduct(product)).toContain("display.title is required");
  });
});

describe("formatPrice", () => {
  it("formats fixed price in cents as dollars", () => {
    expect(formatPrice({ amountType: "fixed", amount: 1900, currency: "usd" })).toBe("$19");
  });

  it("formats free price", () => {
    expect(formatPrice({ amountType: "free" })).toBe("Free");
  });

  it("formats custom price using preset amount", () => {
    expect(formatPrice({ amountType: "custom", presetAmount: 1000, currency: "usd" })).toBe("$10");
  });

  it("formats custom price without preset as custom", () => {
    expect(formatPrice({ amountType: "custom" })).toBe("Custom");
  });
});

describe("generateYearlyProduct", () => {
  const monthlyProduct = {
    slug: "pro-monthly",
    name: "Pro Monthly",
    description: "Full access to all features, billed monthly",
    type: "subscription" as const,
    recurringInterval: "month" as const,
    recurringIntervalCount: 1,
    prices: [{ amountType: "fixed" as const, amount: 1900, currency: "usd" }],
    display: {
      title: "Pro",
      subtitle: "Billed monthly",
      badge: null as string | null,
      features: ["Unlimited projects", "Priority support"],
      highlighted: false,
      cta: "Get Started",
    },
    polarProductId: "abc-123",
  };

  it("creates a yearly counterpart from a monthly subscription", () => {
    const yearly = generateYearlyProduct(monthlyProduct);
    expect(yearly.slug).toBe("pro-yearly");
    expect(yearly.name).toBe("Pro Yearly");
    expect(yearly.type).toBe("subscription");
    expect(yearly.recurringInterval).toBe("year");
    expect(yearly.prices[0].amount).toBe(19000);
  });

  it("clears the polarProductId on the generated product", () => {
    const yearly = generateYearlyProduct(monthlyProduct);
    expect(yearly.polarProductId).toBeNull();
  });

  it("updates display subtitle and badge for yearly", () => {
    const yearly = generateYearlyProduct(monthlyProduct);
    expect(yearly.display.subtitle).toBe("Billed yearly");
    expect(yearly.display.badge).toBe("2 months free");
  });

  it("preserves display title, features, cta, and highlighted", () => {
    const yearly = generateYearlyProduct(monthlyProduct);
    expect(yearly.display.title).toBe("Pro");
    expect(yearly.display.features).toEqual(monthlyProduct.display.features);
    expect(yearly.display.cta).toBe("Get Started");
    expect(yearly.display.highlighted).toBe(monthlyProduct.display.highlighted);
  });
});

describe("generateProductsTypeScript", () => {
  const sandboxProducts = [
    {
      slug: "pro-monthly",
      name: "Pro Monthly",
      type: "subscription" as const,
      recurringInterval: "month" as const,
      prices: [{ amountType: "fixed" as const, amount: 1900, currency: "usd" }],
      display: {
        title: "Pro",
        subtitle: "Billed monthly",
        badge: null as string | null,
        features: ["Unlimited projects"],
        highlighted: false,
        cta: "Get Started",
      },
      polarProductId: "abc-123",
    },
    {
      slug: "free-tier",
      name: "Free Tier",
      type: "free" as const,
      prices: [{ amountType: "free" as const }],
      display: {
        title: "Free",
        features: ["Basic features"],
        badge: null,
        highlighted: false,
        cta: "Start Free",
      },
      polarProductId: null,
    },
  ];

  const productionProducts = [
    {
      slug: "pro-monthly",
      name: "Pro Monthly",
      type: "subscription" as const,
      recurringInterval: "month" as const,
      prices: [{ amountType: "fixed" as const, amount: 1900, currency: "usd" }],
      display: {
        title: "Pro",
        subtitle: "Billed monthly",
        badge: null as string | null,
        features: ["Unlimited projects"],
        highlighted: false,
        cta: "Get Started",
      },
      polarProductId: null,
    },
  ];

  it("includes Generated by tstack header", () => {
    const ts = generateProductsTypeScript({ sandboxProducts, productionProducts });
    expect(ts).toContain("Generated by tstack");
    expect(ts).not.toContain("Generated by eni");
  });

  it("exports sandboxProducts and productionProducts", () => {
    const ts = generateProductsTypeScript({ sandboxProducts, productionProducts });
    expect(ts).toContain('export const sandboxProducts');
    expect(ts).toContain('export const productionProducts');
  });

  it("exports getProducts helper", () => {
    const ts = generateProductsTypeScript({ sandboxProducts, productionProducts });
    expect(ts).toContain('export function getProducts(env: "sandbox" | "production")');
  });

  it("exports getCheckoutProducts helper", () => {
    const ts = generateProductsTypeScript({ sandboxProducts, productionProducts });
    expect(ts).toContain('export function getCheckoutProducts');
  });

  it("exports getDisplayProducts helper", () => {
    const ts = generateProductsTypeScript({ sandboxProducts, productionProducts });
    expect(ts).toContain('export function getDisplayProducts');
  });

  it("includes correct price and period for subscription", () => {
    const ts = generateProductsTypeScript({ sandboxProducts, productionProducts });
    expect(ts).toContain('price: "$19"');
    expect(ts).toContain('period: "/month"');
  });

  it("includes Free price for free product", () => {
    const ts = generateProductsTypeScript({ sandboxProducts, productionProducts });
    expect(ts).toContain('price: "Free"');
  });

  it("sets productId from polarProductId when present", () => {
    const ts = generateProductsTypeScript({ sandboxProducts, productionProducts });
    expect(ts).toContain('productId: "abc-123"');
  });

  it("sets productId to null when polarProductId is absent", () => {
    const ts = generateProductsTypeScript({ sandboxProducts, productionProducts });
    expect(ts).toContain('productId: null');
  });
});

describe("writeProductsGenerated", () => {
  it("writes products.generated.ts to the correct path inside the project directory", () => {
    const dir = makeTempDir("tstack-products-generated-");
    const generatedDir = join(dir, "src", "features", "billing", "generated");

    try {
      const sandboxProducts = [
        {
          slug: "pro-monthly",
          name: "Pro Monthly",
          type: "subscription" as const,
          recurringInterval: "month" as const,
          prices: [{ amountType: "fixed" as const, amount: 1900, currency: "usd" }],
          display: {
            title: "Pro",
            features: ["Unlimited projects"],
            badge: null,
            highlighted: false,
            cta: "Get Started",
          },
          polarProductId: "abc-123",
        },
      ];

      const productionProducts = [
        {
          slug: "pro-monthly",
          name: "Pro Monthly",
          type: "subscription" as const,
          recurringInterval: "month" as const,
          prices: [{ amountType: "fixed" as const, amount: 1900, currency: "usd" }],
          display: {
            title: "Pro",
            features: ["Unlimited projects"],
            badge: null,
            highlighted: false,
            cta: "Get Started",
          },
          polarProductId: null,
        },
      ];

      writeProductsGenerated({
        projectDir: dir,
        sandboxProducts,
        productionProducts,
      });

      const filePath = join(generatedDir, "products.generated.ts");
      expect(existsSync(filePath)).toBe(true);
      const content = readFileSync(filePath, "utf8");
      expect(content).toContain("Generated by tstack");
      expect(content).toContain('export const sandboxProducts');
      expect(content).toContain('export const productionProducts');
      expect(content).toContain('productId: "abc-123"');
      expect(content).toContain('productId: null');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
