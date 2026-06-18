export interface PolarCredentials {
  token: string;
}

import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

function readEnvValue(projectDir: string, fileName: string, key: string): string | undefined {
  try {
    const content = readFileSync(join(resolve(projectDir), fileName), "utf8");
    const lines = content.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("#")) continue;
      if (trimmed.startsWith(`${key}=`)) {
        return trimmed.slice(key.length + 1).trim();
      }
    }
    return undefined;
  } catch {
    return undefined;
  }
}

export function loadPolarCredentials(projectDir: string, tokenOverride?: string): PolarCredentials | null {
  if (tokenOverride) {
    return { token: tokenOverride };
  }

  const token =
    readEnvValue(projectDir, ".env.local", "POLAR_ACCESS_TOKEN") ??
    readEnvValue(projectDir, ".env", "POLAR_ACCESS_TOKEN");

  if (token) {
    return { token };
  }

  return null;
}

import { Polar } from "@polar-sh/sdk";
import type { ProductCreate } from "@polar-sh/sdk/models/components/productcreate.js";

export function createPolarClient(credentials: PolarCredentials, env: "sandbox" | "production"): Polar {
  return new Polar({
    accessToken: credentials.token,
    server: env,
  });
}

export interface TStackProduct {
  slug: string;
  name: string;
  description?: string;
  type: "subscription" | "one_time" | "free";
  recurringInterval?: "day" | "week" | "month" | "year";
  recurringIntervalCount?: number;
  prices: Array<{
    amountType: "fixed" | "custom" | "free";
    amount?: number;
    currency?: string;
    minimumAmount?: number;
    maximumAmount?: number;
    presetAmount?: number;
  }>;
  display: {
    title: string;
    subtitle?: string;
    badge: string | null;
    features: string[];
    highlighted: boolean;
    cta: string;
  };
  polarProductId?: string | null;
}

export function convertToPolarProduct(localProduct: TStackProduct): ProductCreate {
  const base = {
    name: localProduct.name,
    description: localProduct.description ?? null,
    metadata: { source: "tstack-cli" },
  };

  const price = localProduct.prices[0];

  if (localProduct.type === "free" || !price || price.amountType === "free") {
    return {
      ...base,
      prices: [{ amountType: "free" }],
    };
  }

  if (price.amountType === "custom") {
    return {
      ...base,
      prices: [{ amountType: "custom" }],
    };
  }

  const polarPrice = {
    amountType: "fixed" as const,
    priceAmount: price.amount ?? 0,
    priceCurrency: price.currency ?? "usd",
  };

  if (localProduct.type === "subscription" && localProduct.recurringInterval) {
    return {
      ...base,
      recurringInterval: localProduct.recurringInterval,
      prices: [polarPrice],
    };
  }

  return {
    ...base,
    prices: [polarPrice],
    recurringInterval: null,
  };
}

export interface SyncResult {
  polarProductId: string;
}

export async function syncProductToPolar(
  client: Polar,
  localProduct: TStackProduct,
): Promise<SyncResult> {
  const polarProduct = convertToPolarProduct(localProduct);

  if (localProduct.polarProductId) {
    const updated = await client.products.update({
      id: localProduct.polarProductId,
      productUpdate: {
        name: polarProduct.name,
        description: polarProduct.description,
        metadata: polarProduct.metadata,
      },
    });
    return { polarProductId: updated.id };
  }

  const created = await client.products.create(polarProduct);
  return { polarProductId: created.id };
}

export async function checkSyncStatus(
  client: Polar,
  localProduct: TStackProduct,
): Promise<"synced" | "not-synced" | "archived" | "error"> {
  if (!localProduct.polarProductId) {
    return "not-synced";
  }

  try {
    const polarProduct = await client.products.get({ id: localProduct.polarProductId });
    if (polarProduct.isArchived) {
      return "archived";
    }
    return "synced";
  } catch {
    return "error";
  }
}

export async function archivePolarProduct(client: Polar, productId: string): Promise<void> {
  await client.products.update({ id: productId, productUpdate: { isArchived: true } });
}

export async function unarchivePolarProduct(client: Polar, productId: string): Promise<void> {
  await client.products.update({ id: productId, productUpdate: { isArchived: false } });
}

export interface PolarProductSummary {
  id: string;
  name: string;
}

export async function listActivePolarProducts(client: Polar): Promise<PolarProductSummary[]> {
  const page = await client.products.list({ isArchived: false, limit: 100 });
  const products: PolarProductSummary[] = [];

  for await (const response of page) {
    for (const item of response.result.items) {
      const metadata = item.metadata as Record<string, unknown> | undefined;
      if (metadata?.source === "tstack-cli") {
        products.push({ id: item.id, name: item.name });
      }
    }
  }

  return products;
}

export async function listArchivedPolarProducts(client: Polar): Promise<PolarProductSummary[]> {
  const page = await client.products.list({ isArchived: true, limit: 100 });
  const products: PolarProductSummary[] = [];

  for await (const response of page) {
    for (const item of response.result.items) {
      const metadata = item.metadata as Record<string, unknown> | undefined;
      if (metadata?.source === "tstack-cli") {
        products.push({ id: item.id, name: item.name });
      }
    }
  }

  return products;
}

export function toBuyerMessage(error: unknown): string {
  if (error == null) {
    return "An unexpected error occurred.";
  }

  const name =
    typeof error === "object" && error !== null && "name" in error && typeof error.name === "string"
      ? error.name
      : "";
  const message =
    typeof error === "object" && error !== null && "message" in error && typeof error.message === "string"
      ? error.message
      : "";

  if (name === "ResourceNotFound" || message.toLowerCase().includes("not found")) {
    return `Polar product not found: ${message}`;
  }

  if (name === "HTTPValidationError" || message.toLowerCase().includes("validation")) {
    return `Invalid request: ${message}`;
  }

  if (name === "NotPermitted" || message.toLowerCase().includes("permission")) {
    return `Permission denied: ${message}`;
  }

  if (message) {
    return message;
  }

  return "An unexpected error occurred.";
}
