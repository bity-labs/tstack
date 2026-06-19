import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

import { readMeters, writeMetersGenerated, type Meter } from "./meters.js";
import { readProducts, writeProductsGenerated, type Product } from "./products.js";

function readProductsIfPresent(filePath: string): Product[] {
  return existsSync(filePath) ? readProducts(filePath) : [];
}

function readMetersIfPresent(filePath: string): Meter[] {
  return existsSync(filePath) ? readMeters(filePath) : [];
}

export function writeBillingGenerated(options: { projectDir: string }): void {
  const projectDir = resolve(options.projectDir);
  const polarDir = join(projectDir, "polar");

  const sandboxProducts = readProductsIfPresent(join(polarDir, "products.sandbox.json"));
  const productionProducts = readProductsIfPresent(join(polarDir, "products.production.json"));
  const sandboxMeters = readMetersIfPresent(join(polarDir, "meters.sandbox.json"));
  const productionMeters = readMetersIfPresent(join(polarDir, "meters.production.json"));

  writeProductsGenerated({ projectDir, sandboxProducts, productionProducts });
  writeMetersGenerated({ projectDir, sandboxMeters, productionMeters });
}
