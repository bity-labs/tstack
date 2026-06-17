import { Box, Text } from "ink";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { join } from "node:path";
import { existsSync } from "node:fs";

import { Header } from "./components/Header.js";
import { StatusMessage } from "./components/StatusMessage.js";
import { ProductList, type SyncStatus } from "./components/ProductList.js";
import { OperationMenu, type Operation } from "./components/OperationMenu.js";
import { Select } from "./components/Select.js";
import { TextInput } from "./components/TextInput.js";
import { Confirm } from "./components/Confirm.js";
import { Spinner } from "./components/Spinner.js";
import {
  readProducts,
  writeProducts,
  writeProductsGenerated,
  generateYearlyProduct,
  type Product,
} from "./lib/products.js";
import {
  loadPolarCredentials,
  createPolarClient,
  syncProductToPolar,
  checkSyncStatus,
  toBuyerMessage,
} from "./lib/polar.js";

export interface ProductsWizardProps {
  projectDir: string;
  env: "sandbox" | "production";
  token?: string;
  onComplete?: () => void;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function ProductsWizard({ projectDir, env, token, onComplete }: ProductsWizardProps) {
  const [step, setStep] = useState<string>("loading");
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState("");

  // Add product form state
  const [newType, setNewType] = useState<string>("");
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newInterval, setNewInterval] = useState("month");
  const [newDisplayTitle, setNewDisplayTitle] = useState("");
  const [newFeatures, setNewFeatures] = useState("");
  const [newCta, setNewCta] = useState("Get Started");
  const [newHighlighted, setNewHighlighted] = useState(false);
  const [yearlyDraft, setYearlyDraft] = useState<Product | null>(null);

  // Sync state
  const [polarToken, setPolarToken] = useState<string>("");
  const [syncResults, setSyncResults] = useState<Array<{ slug: string; status: string }>>([]);

  const productsFilePath = useMemo(() => {
    const fileName = env === "sandbox" ? "products.sandbox.json" : "products.production.json";
    return join(projectDir, "polar", fileName);
  }, [projectDir, env]);

  const otherProductsFilePath = useMemo(() => {
    const fileName = env === "sandbox" ? "products.production.json" : "products.sandbox.json";
    return join(projectDir, "polar", fileName);
  }, [projectDir, env]);

  const loadProducts = useCallback(() => {
    try {
      if (!existsSync(productsFilePath)) {
        setProducts([]);
        setStep("menu");
        return;
      }
      const loaded = readProducts(productsFilePath);
      setProducts(loaded);
      setStep("menu");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStep("error");
    }
  }, [productsFilePath]);

  useEffect(() => {
    if (step === "loading") {
      loadProducts();
    }
  }, [step, loadProducts]);

  useEffect(() => {
    if (step === "regenerate") {
      handleRegenerate();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const syncStatus = useMemo(() => {
    const map = new Map<string, SyncStatus>();
    for (const product of products) {
      if (product.polarProductId) {
        map.set(product.slug, "synced");
      } else {
        map.set(product.slug, "not-synced");
      }
    }
    return map;
  }, [products]);

  const handleOperationSelect = (operation: Operation) => {
    if (operation === "add") {
      setNewType("");
      setNewName("");
      setNewSlug("");
      setNewPrice("");
      setNewInterval("month");
      setNewDisplayTitle("");
      setNewFeatures("");
      setNewCta("Get Started");
      setNewHighlighted(false);
      setYearlyDraft(null);
      setStep("add_type");
    } else if (operation === "regenerate") {
      setStep("regenerate");
    } else if (operation === "sync") {
      const credentials = loadPolarCredentials(projectDir, token);
      if (credentials) {
        setStep("sync_checking");
      } else {
        setPolarToken("");
        setStep("sync_credentials");
      }
    }
  };

  const handleSyncCredentials = (inputToken: string) => {
    if (!inputToken.trim()) {
      setError("Polar access token is required.");
      setStep("error");
      return;
    }
    setPolarToken(inputToken.trim());
    setStep("sync_checking");
  };

  const runSync = useCallback(async () => {
    const credentials = loadPolarCredentials(projectDir, token) ?? { token: polarToken };
    const client = createPolarClient(credentials, env);

    const updatedProducts: Product[] = [];
    const results: Array<{ slug: string; status: string }> = [];

    for (const product of products) {
      try {
        const status = await checkSyncStatus(client, product);
        if (status === "synced" || status === "archived") {
          results.push({ slug: product.slug, status });
          updatedProducts.push(product);
          continue;
        }

        const result = await syncProductToPolar(client, product);
        updatedProducts.push({ ...product, polarProductId: result.polarProductId });
        results.push({ slug: product.slug, status: "synced" });
      } catch (err) {
        results.push({ slug: product.slug, status: toBuyerMessage(err) });
        updatedProducts.push(product);
      }
    }

    setSyncResults(results);

    if (updatedProducts.some((p, i) => p.polarProductId !== products[i]?.polarProductId)) {
      writeProducts(productsFilePath, updatedProducts);
      setProducts(updatedProducts);
      regenerateFiles(updatedProducts);
    }

    setStep("done");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, projectDir, env, token, polarToken, productsFilePath]);

  useEffect(() => {
    if (step === "sync_checking") {
      runSync().catch((err) => {
        setError(err instanceof Error ? err.message : String(err));
        setStep("error");
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const handleAddType = (type: string) => {
    setNewType(type);
    setStep("add_name");
  };

  const handleAddName = (name: string) => {
    setNewName(name);
    if (!newSlug) {
      setNewSlug(slugify(name));
    }
    setStep("add_slug");
  };

  const handleAddSlug = (slug: string) => {
    setNewSlug(slug);
    if (newType === "free") {
      setStep("add_display_title");
    } else {
      setStep("add_price");
    }
  };

  const handleAddPrice = (price: string) => {
    setNewPrice(price);
    if (newType === "subscription") {
      setStep("add_interval");
    } else {
      setStep("add_display_title");
    }
  };

  const handleAddInterval = (interval: string) => {
    setNewInterval(interval);
    setStep("add_display_title");
  };

  const handleAddDisplayTitle = (title: string) => {
    setNewDisplayTitle(title);
    setStep("add_features");
  };

  const handleAddFeatures = (features: string) => {
    setNewFeatures(features);
    setStep("add_cta");
  };

  const handleAddCta = (cta: string) => {
    setNewCta(cta);
    setStep("add_highlighted");
  };

  const handleAddHighlighted = (highlighted: boolean) => {
    setNewHighlighted(highlighted);
    setStep("add_confirm");
  };

  const buildProduct = (): Product => {
    const features = newFeatures
      .split(",")
      .map((f) => f.trim())
      .filter((f) => f.length > 0);

    if (newType === "free") {
      return {
        slug: newSlug,
        name: newName,
        type: "free",
        prices: [{ amountType: "free" }],
        display: {
          title: newDisplayTitle || newName,
          features,
          badge: null,
          highlighted: newHighlighted,
          cta: newCta,
        },
        polarProductId: null,
      };
    }

    const amount = Math.round(parseFloat(newPrice || "0") * 100);

    if (newType === "one_time") {
      return {
        slug: newSlug,
        name: newName,
        type: "one_time",
        prices: [{ amountType: "fixed", amount, currency: "usd" }],
        display: {
          title: newDisplayTitle || newName,
          features,
          badge: null,
          highlighted: newHighlighted,
          cta: newCta,
        },
        polarProductId: null,
      };
    }

    return {
      slug: newSlug,
      name: newName,
      type: "subscription",
      recurringInterval: newInterval as Product["recurringInterval"],
      recurringIntervalCount: 1,
      prices: [{ amountType: "fixed", amount, currency: "usd" }],
      display: {
        title: newDisplayTitle || newName,
        features,
        badge: null,
        highlighted: newHighlighted,
        cta: newCta,
      },
      polarProductId: null,
    };
  };

  const handleConfirmAdd = (confirmed: boolean) => {
    if (!confirmed) {
      setStep("menu");
      return;
    }

    const product = buildProduct();
    const updated = [...products, product];
    setProducts(updated);

    try {
      writeProducts(productsFilePath, updated);

      if (product.type === "subscription" && product.recurringInterval === "month") {
        const yearly = generateYearlyProduct(product);
        setYearlyDraft(yearly);
        setStep("add_yearly");
        return;
      }

      regenerateFiles(updated);
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStep("error");
    }
  };

  const handleYearlyConfirm = (confirmed: boolean) => {
    if (confirmed && yearlyDraft) {
      const updated = [...products, yearlyDraft];
      setProducts(updated);
      try {
        writeProducts(productsFilePath, updated);
        regenerateFiles(updated);
        setStep("done");
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setStep("error");
      }
    } else {
      try {
        regenerateFiles(products);
        setStep("done");
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setStep("error");
      }
    }
  };

  const regenerateFiles = (currentProducts: Product[]) => {
    const sandboxProducts = env === "sandbox"
      ? currentProducts
      : (existsSync(otherProductsFilePath) ? readProducts(otherProductsFilePath) : []);
    const productionProducts = env === "production"
      ? currentProducts
      : (existsSync(otherProductsFilePath) ? readProducts(otherProductsFilePath) : []);
    writeProductsGenerated({ projectDir, sandboxProducts, productionProducts });
  };

  const handleRegenerate = () => {
    try {
      const currentProducts = existsSync(productsFilePath) ? readProducts(productsFilePath) : [];
      const otherProducts = existsSync(otherProductsFilePath) ? readProducts(otherProductsFilePath) : [];
      const sandboxProducts = env === "sandbox" ? currentProducts : otherProducts;
      const productionProducts = env === "production" ? currentProducts : otherProducts;
      writeProductsGenerated({ projectDir, sandboxProducts, productionProducts });
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStep("error");
    }
  };

  return (
    <Box flexDirection="column">
      <Header />
      {step === "loading" && <StatusMessage status="info">Loading products...</StatusMessage>}
      {step === "menu" && (
        <Box flexDirection="column">
          <Text bold>TStack Products Manager</Text>
          <Text>Environment: {env}</Text>
          <Box marginTop={1}>
            <ProductList
              products={products.map((p) => ({
                slug: p.slug,
                name: p.name,
                type: p.type,
                recurringInterval: p.recurringInterval,
                prices: p.prices,
              }))}
              syncStatus={syncStatus}
            />
          </Box>
          <Box marginTop={1}>
            <OperationMenu hasProducts={products.length > 0} onSelect={handleOperationSelect} />
          </Box>
        </Box>
      )}
      {step === "add_type" && (
        <Select
          label="Select product type"
          options={[
            { label: "Subscription", value: "subscription" },
            { label: "One-time", value: "one_time" },
            { label: "Free", value: "free" },
          ]}
          onSelect={handleAddType}
        />
      )}
      {step === "add_name" && (
        <TextInput
          label="Product name"
          value={newName}
          onChange={setNewName}
          onSubmit={handleAddName}
          placeholder="Pro Monthly"
        />
      )}
      {step === "add_slug" && (
        <TextInput
          label="Product slug"
          value={newSlug}
          onChange={setNewSlug}
          onSubmit={handleAddSlug}
          placeholder={slugify(newName) || "pro-monthly"}
        />
      )}
      {step === "add_price" && (
        <TextInput
          label="Price in dollars"
          value={newPrice}
          onChange={setNewPrice}
          onSubmit={handleAddPrice}
          placeholder="19"
        />
      )}
      {step === "add_interval" && (
        <Select
          label="Billing interval"
          options={[
            { label: "Day", value: "day" },
            { label: "Week", value: "week" },
            { label: "Month", value: "month" },
            { label: "Year", value: "year" },
          ]}
          onSelect={handleAddInterval}
        />
      )}
      {step === "add_display_title" && (
        <TextInput
          label="Display title"
          value={newDisplayTitle}
          onChange={setNewDisplayTitle}
          onSubmit={handleAddDisplayTitle}
          placeholder={newName}
        />
      )}
      {step === "add_features" && (
        <TextInput
          label="Features (comma-separated)"
          value={newFeatures}
          onChange={setNewFeatures}
          onSubmit={handleAddFeatures}
          placeholder="Unlimited projects, Priority support"
        />
      )}
      {step === "add_cta" && (
        <TextInput
          label="Call to action"
          value={newCta}
          onChange={setNewCta}
          onSubmit={handleAddCta}
          placeholder="Get Started"
        />
      )}
      {step === "add_highlighted" && (
        <Box flexDirection="column">
          <Text>Highlight this product on the pricing page?</Text>
          <Confirm label="Highlighted" onConfirm={handleAddHighlighted} defaultValue={false} />
        </Box>
      )}
      {step === "add_confirm" && (
        <Box flexDirection="column">
          <Text>Add {newName} ({newSlug})?</Text>
          <Confirm label="Confirm add" onConfirm={handleConfirmAdd} defaultValue={true} />
        </Box>
      )}
      {step === "add_yearly" && yearlyDraft && (
        <Box flexDirection="column">
          <Text>Would you like to add the yearly counterpart: {yearlyDraft.name}?</Text>
          <Text dimColor>Price: ${(yearlyDraft.prices[0]?.amount ?? 0) / 100}/year</Text>
          <Confirm label="Add yearly product" onConfirm={handleYearlyConfirm} defaultValue={true} />
        </Box>
      )}
      {step === "sync_credentials" && (
        <TextInput
          label="Polar access token"
          value={polarToken}
          onChange={setPolarToken}
          onSubmit={handleSyncCredentials}
          placeholder="polar_..."
        />
      )}
      {step === "sync_checking" && (
        <Box flexDirection="column">
          <Spinner label="Syncing products with Polar..." />
        </Box>
      )}
      {step === "regenerate" && (
        <Box flexDirection="column">
          <Spinner label="Regenerating TypeScript exports..." />
        </Box>
      )}
      {step === "done" && (
        <Box flexDirection="column">
          <StatusMessage status="success">Operation completed successfully.</StatusMessage>
          {syncResults.length > 0 && (
            <Box flexDirection="column" marginTop={1}>
              {syncResults.map((r) => (
                <Text key={r.slug}>
                  {r.slug}: {r.status}
                </Text>
              ))}
            </Box>
          )}
        </Box>
      )}
      {step === "error" && <StatusMessage status="error">{error}</StatusMessage>}
    </Box>
  );
}
