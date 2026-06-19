import { describe, expect, it } from "vitest";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { writeBillingGenerated } from "./billing-generated.js";

function makeTempDir(prefix: string): string {
  return mkdtempSync(join(tmpdir(), prefix));
}

function writeJson(path: string, data: unknown): void {
  writeFileSync(path, JSON.stringify(data, null, 2));
}

describe("writeBillingGenerated", () => {
  it("reads sandbox and production product and meter JSON and writes generated billing exports", () => {
    const dir = makeTempDir("tstack-billing-generated-");
    const polarDir = join(dir, "polar");

    try {
      mkdirSync(polarDir, { recursive: true });
      const product = {
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
      const meter = {
        slug: "llm-tokens",
        name: "LLM Tokens",
        polarMeterId: null,
        eventNames: ["use-credit"],
      };

      writeJson(join(polarDir, "products.sandbox.json"), { products: [{ ...product, polarProductId: "prod-sandbox" }] });
      writeJson(join(polarDir, "products.production.json"), { products: [product] });
      writeJson(join(polarDir, "meters.sandbox.json"), { meters: [{ ...meter, polarMeterId: "meter-sandbox" }] });
      writeJson(join(polarDir, "meters.production.json"), { meters: [meter] });

      writeBillingGenerated({ projectDir: dir });

      const productsPath = join(dir, "src", "features", "billing", "generated", "products.generated.ts");
      const metersPath = join(dir, "src", "features", "billing", "generated", "meters.generated.ts");
      expect(existsSync(productsPath)).toBe(true);
      expect(existsSync(metersPath)).toBe(true);
      expect(readFileSync(productsPath, "utf8")).toContain('productId: "prod-sandbox"');
      expect(readFileSync(metersPath, "utf8")).toContain('polarMeterId: "meter-sandbox"');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
