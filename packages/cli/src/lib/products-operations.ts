import { existsSync } from "node:fs";
import { Polar } from "@polar-sh/sdk";

import {
  readProducts,
  writeProducts,
  type Product,
} from "./products.js";
import {
  archivePolarProduct,
  unarchivePolarProduct,
  listActivePolarProducts,
  convertToPolarProduct,
  toBuyerMessage,
} from "./polar.js";
import { slugify } from "./validate.js";

export interface OperationResult {
  slug: string;
  status: "success" | "failure";
  message: string;
}

export interface RemoveProductsOptions {
  productsFilePath: string;
  slugsToRemove: string[];
  client: Polar;
  regenerate: (products: Product[]) => void;
}

export async function removeProducts(options: RemoveProductsOptions): Promise<OperationResult[]> {
  const { productsFilePath, slugsToRemove, client, regenerate } = options;
  const products = existsSync(productsFilePath) ? readProducts(productsFilePath) : [];
  const results: OperationResult[] = [];
  const remaining: Product[] = [];

  for (const product of products) {
    if (!slugsToRemove.includes(product.slug)) {
      remaining.push(product);
      continue;
    }

    try {
      if (product.polarProductId) {
        await archivePolarProduct(client, product.polarProductId);
      }
      results.push({ slug: product.slug, status: "success", message: "Removed" });
    } catch (err) {
      results.push({ slug: product.slug, status: "failure", message: toBuyerMessage(err) });
      remaining.push(product);
    }
  }

  if (remaining.length !== products.length) {
    writeProducts(productsFilePath, remaining);
    regenerate(remaining);
  }
  return results;
}

export interface UnarchiveProductsOptions {
  idsToUnarchive: string[];
  client: Polar;
}

export async function unarchiveProducts(options: UnarchiveProductsOptions): Promise<OperationResult[]> {
  const { idsToUnarchive, client } = options;
  const results: OperationResult[] = [];

  for (const id of idsToUnarchive) {
    try {
      await unarchivePolarProduct(client, id);
      results.push({ slug: id, status: "success", message: "Unarchived" });
    } catch (err) {
      results.push({ slug: id, status: "failure", message: toBuyerMessage(err) });
    }
  }

  return results;
}

export interface FindOrphanProductsOptions {
  client: Polar;
  localProducts: Product[];
}

export async function findOrphanProducts(
  options: FindOrphanProductsOptions,
): Promise<Array<{ id: string; name: string }>> {
  const { client, localProducts } = options;
  const localIds = new Set(localProducts.map((p) => p.polarProductId).filter((id): id is string => id != null));
  const active = await listActivePolarProducts(client);
  return active.filter((p) => !localIds.has(p.id));
}

export interface ArchiveOrphanProductsOptions {
  orphanIds: string[];
  client: Polar;
}

export async function archiveOrphanProducts(options: ArchiveOrphanProductsOptions): Promise<OperationResult[]> {
  const { orphanIds, client } = options;
  const results: OperationResult[] = [];

  for (const id of orphanIds) {
    try {
      await archivePolarProduct(client, id);
      results.push({ slug: id, status: "success", message: "Archived" });
    } catch (err) {
      results.push({ slug: id, status: "failure", message: toBuyerMessage(err) });
    }
  }

  return results;
}

export interface ImportOrphanProductsOptions {
  productsFilePath: string;
  orphans: Array<{ id: string; name: string }>;
  regenerate: (products: Product[]) => void;
}

export function importOrphanProducts(options: ImportOrphanProductsOptions): OperationResult[] {
  const { productsFilePath, orphans, regenerate } = options;
  const products = existsSync(productsFilePath) ? readProducts(productsFilePath) : [];
  const existingSlugs = new Set(products.map((p) => p.slug));
  const results: OperationResult[] = [];

  for (const orphan of orphans) {
    let slug = slugify(orphan.name);
    if (existingSlugs.has(slug)) {
      let counter = 1;
      while (existingSlugs.has(`${slug}-${counter}`)) {
        counter++;
      }
      slug = `${slug}-${counter}`;
    }
    existingSlugs.add(slug);

    const imported: Product = {
      slug,
      name: orphan.name,
      type: "free",
      prices: [{ amountType: "free" }],
      display: {
        title: orphan.name,
        features: [],
        badge: null,
        highlighted: false,
        cta: "Get Started",
      },
      polarProductId: orphan.id,
    };

    products.push(imported);
    results.push({ slug, status: "success", message: "Imported" });
  }

  writeProducts(productsFilePath, products);
  regenerate(products);
  return results;
}

export interface SyncSandboxToProductionOptions {
  sandboxProducts: Product[];
  slugsToSync: string[];
  productionClient: Polar;
  productionProductsFilePath: string;
  regenerate: (products: Product[]) => void;
}

export async function syncSandboxToProduction(
  options: SyncSandboxToProductionOptions,
): Promise<OperationResult[]> {
  const { sandboxProducts, slugsToSync, productionClient, productionProductsFilePath, regenerate } = options;
  const productionProducts = existsSync(productionProductsFilePath)
    ? readProducts(productionProductsFilePath)
    : [];
  const results: OperationResult[] = [];

  for (const sandboxProduct of sandboxProducts) {
    if (!slugsToSync.includes(sandboxProduct.slug)) continue;

    try {
      const polarProduct = convertToPolarProduct(sandboxProduct);
      const created = await productionClient.products.create(polarProduct);

      const existingIndex = productionProducts.findIndex((p) => p.slug === sandboxProduct.slug);
      const productionProduct: Product = {
        ...sandboxProduct,
        polarProductId: created.id,
      };

      if (existingIndex >= 0) {
        productionProducts[existingIndex] = productionProduct;
      } else {
        productionProducts.push(productionProduct);
      }

      results.push({ slug: sandboxProduct.slug, status: "success", message: "Synced to production" });
    } catch (err) {
      results.push({ slug: sandboxProduct.slug, status: "failure", message: toBuyerMessage(err) });
    }
  }

  writeProducts(productionProductsFilePath, productionProducts);
  regenerate(productionProducts);
  return results;
}
