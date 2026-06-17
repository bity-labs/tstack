import { Box, Text } from "ink";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { join } from "node:path";
import { existsSync } from "node:fs";

import { Header } from "./components/Header.js";
import { StatusMessage } from "./components/StatusMessage.js";
import { ProductList, type SyncStatus } from "./components/ProductList.js";
import { OperationMenu, type Operation } from "./components/OperationMenu.js";
import { Select } from "./components/Select.js";
import { MultiSelect } from "./components/MultiSelect.js";
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
  listArchivedPolarProducts,
  toBuyerMessage,
} from "./lib/polar.js";
import {
  removeProducts,
  unarchiveProducts,
  findOrphanProducts,
  archiveOrphanProducts,
  importOrphanProducts,
  syncSandboxToProduction,
  type OperationResult,
} from "./lib/products-operations.js";

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

  // Advanced operations state
  const [credentialTargetStep, setCredentialTargetStep] = useState<string>("");
  const [operationResults, setOperationResults] = useState<OperationResult[]>([]);
  const [pendingSelection, setPendingSelection] = useState<string[]>([]);
  const [archivedPolarProducts, setArchivedPolarProducts] = useState<Array<{ id: string; name: string }>>([]);
  const [orphanProducts, setOrphanProducts] = useState<Array<{ id: string; name: string }>>([]);
  const [cleanupAction, setCleanupAction] = useState<string>("");
  const [sandboxProductsList, setSandboxProductsList] = useState<Product[]>([]);

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

  const ensurePolarCredentials = (targetStep: string): { token: string } | null => {
    const creds = loadPolarCredentials(projectDir, token);
    if (creds) return creds;
    if (polarToken) return { token: polarToken };
    setPolarToken("");
    setCredentialTargetStep(targetStep);
    setStep("credentials");
    return null;
  };

  const handleCredentials = (inputToken: string) => {
    if (!inputToken.trim()) {
      setError("Polar access token is required.");
      setStep("error");
      return;
    }
    setPolarToken(inputToken.trim());
    setStep(credentialTargetStep);
  };

  const handleOperationSelect = (operation: Operation) => {
    setOperationResults([]);
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
      const creds = ensurePolarCredentials("sync_checking");
      if (creds) {
        setStep("sync_checking");
      }
    } else if (operation === "remove") {
      setPendingSelection([]);
      setStep("remove_select");
    } else if (operation === "unarchive") {
      const creds = ensurePolarCredentials("unarchive_loading");
      if (creds) {
        setStep("unarchive_loading");
      }
    } else if (operation === "cleanup") {
      const creds = ensurePolarCredentials("cleanup_loading");
      if (creds) {
        setStep("cleanup_loading");
      }
    } else if (operation === "sync_from_sandbox") {
      const sandboxProducts = existsSync(otherProductsFilePath) ? readProducts(otherProductsFilePath) : [];
      setSandboxProductsList(sandboxProducts);
      const creds = ensurePolarCredentials("sync_from_sandbox_select");
      if (creds) {
        setStep("sync_from_sandbox_select");
      }
    }
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

  const runRemove = useCallback(async () => {
    const credentials = loadPolarCredentials(projectDir, token) ?? { token: polarToken };
    const client = createPolarClient(credentials, env);
    const results = await removeProducts({
      productsFilePath,
      slugsToRemove: pendingSelection,
      client,
      regenerate: (updated) => {
        setProducts(updated);
        regenerateFiles(updated);
      },
    });
    setOperationResults(results);
    setStep("done");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingSelection, productsFilePath, projectDir, env, token, polarToken]);

  const runUnarchive = useCallback(async () => {
    const credentials = loadPolarCredentials(projectDir, token) ?? { token: polarToken };
    const client = createPolarClient(credentials, env);
    const results = await unarchiveProducts({
      idsToUnarchive: pendingSelection,
      client,
    });
    setOperationResults(results);
    setStep("done");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingSelection, projectDir, env, token, polarToken]);

  const runCleanup = useCallback(async () => {
    const credentials = loadPolarCredentials(projectDir, token) ?? { token: polarToken };
    const client = createPolarClient(credentials, env);

    if (cleanupAction === "archive") {
      const results = await archiveOrphanProducts({
        orphanIds: pendingSelection,
        client,
      });
      setOperationResults(results);
    } else if (cleanupAction === "import") {
      const results = importOrphanProducts({
        productsFilePath,
        orphans: orphanProducts.filter((o) => pendingSelection.includes(o.id)),
        regenerate: (updated) => {
          setProducts(updated);
          regenerateFiles(updated);
        },
      });
      setOperationResults(results);
    }

    setStep("done");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleanupAction, pendingSelection, orphanProducts, productsFilePath, projectDir, env, token, polarToken]);

  const runSyncFromSandbox = useCallback(async () => {
    const credentials = loadPolarCredentials(projectDir, token) ?? { token: polarToken };
    const client = createPolarClient(credentials, "production");
    const results = await syncSandboxToProduction({
      sandboxProducts: sandboxProductsList,
      slugsToSync: pendingSelection,
      productionClient: client,
      productionProductsFilePath: productsFilePath,
      regenerate: (updated) => {
        setProducts(updated);
        regenerateFiles(updated);
      },
    });
    setOperationResults(results);
    setStep("done");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sandboxProductsList, pendingSelection, productsFilePath, projectDir, token, polarToken]);

  useEffect(() => {
    if (step === "sync_checking") {
      runSync().catch((err) => {
        setError(err instanceof Error ? err.message : String(err));
        setStep("error");
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  useEffect(() => {
    if (step === "remove_running") {
      runRemove().catch((err) => {
        setError(err instanceof Error ? err.message : String(err));
        setStep("error");
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  useEffect(() => {
    if (step === "unarchive_loading") {
      (async () => {
        try {
          const credentials = loadPolarCredentials(projectDir, token) ?? { token: polarToken };
          const client = createPolarClient(credentials, env);
          const archived = await listArchivedPolarProducts(client);
          setArchivedPolarProducts(archived);
          if (archived.length === 0) {
            setError("No archived Polar products found.");
            setStep("error");
          } else {
            setPendingSelection([]);
            setStep("unarchive_select");
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : String(err));
          setStep("error");
        }
      })();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  useEffect(() => {
    if (step === "unarchive_running") {
      runUnarchive().catch((err) => {
        setError(err instanceof Error ? err.message : String(err));
        setStep("error");
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  useEffect(() => {
    if (step === "cleanup_loading") {
      (async () => {
        try {
          const credentials = loadPolarCredentials(projectDir, token) ?? { token: polarToken };
          const client = createPolarClient(credentials, env);
          const orphans = await findOrphanProducts({ client, localProducts: products });
          setOrphanProducts(orphans);
          if (orphans.length === 0) {
            setError("No orphan Polar products found.");
            setStep("error");
          } else {
            setPendingSelection([]);
            setStep("cleanup_menu");
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : String(err));
          setStep("error");
        }
      })();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  useEffect(() => {
    if (step === "cleanup_running") {
      runCleanup().catch((err) => {
        setError(err instanceof Error ? err.message : String(err));
        setStep("error");
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  useEffect(() => {
    if (step === "sync_from_sandbox_running") {
      runSyncFromSandbox().catch((err) => {
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

  const handleRemoveSelect = (slugs: string[]) => {
    if (slugs.length === 0) {
      setStep("menu");
      return;
    }
    setPendingSelection(slugs);
    const selectedProducts = products.filter((p) => slugs.includes(p.slug));
    const needsCredentials = selectedProducts.some((p) => p.polarProductId != null);
    if (needsCredentials) {
      const creds = ensurePolarCredentials("remove_running");
      if (!creds) return;
    }
    setStep("remove_running");
  };

  const handleUnarchiveSelect = (ids: string[]) => {
    if (ids.length === 0) {
      setStep("menu");
      return;
    }
    setPendingSelection(ids);
    setStep("unarchive_running");
  };

  const handleCleanupMenuSelect = (action: string) => {
    setCleanupAction(action);
    setPendingSelection([]);
    if (action === "archive") {
      setStep("cleanup_archive_select");
    } else if (action === "import") {
      setStep("cleanup_import_select");
    }
  };

  const handleCleanupSelect = (ids: string[]) => {
    if (ids.length === 0) {
      setStep("menu");
      return;
    }
    setPendingSelection(ids);
    setStep("cleanup_running");
  };

  const handleSyncFromSandboxSelect = (slugs: string[]) => {
    if (slugs.length === 0) {
      setStep("menu");
      return;
    }
    setPendingSelection(slugs);
    setStep("sync_from_sandbox_running");
  };

  const hasArchivedProducts = products.some((p) => p.polarProductId != null);
  const showSyncFromSandbox = env === "production" && existsSync(otherProductsFilePath) && readProducts(otherProductsFilePath).length > 0;

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
            <OperationMenu
              hasProducts={products.length > 0}
              hasArchivedProducts={hasArchivedProducts}
              showSyncFromSandbox={showSyncFromSandbox}
              onSelect={handleOperationSelect}
            />
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
      {step === "credentials" && (
        <TextInput
          label="Polar access token"
          value={polarToken}
          onChange={setPolarToken}
          onSubmit={handleCredentials}
          placeholder="polar_..."
        />
      )}
      {step === "sync_checking" && (
        <Box flexDirection="column">
          <Spinner label="Syncing products with Polar..." />
        </Box>
      )}
      {step === "remove_select" && (
        <MultiSelect
          label="Select products to remove"
          items={products.map((p) => ({ label: `${p.name} (${p.slug})`, value: p.slug }))}
          onSubmit={handleRemoveSelect}
        />
      )}
      {step === "remove_running" && (
        <Box flexDirection="column">
          <Spinner label="Removing products..." />
        </Box>
      )}
      {step === "unarchive_loading" && (
        <Box flexDirection="column">
          <Spinner label="Loading archived Polar products..." />
        </Box>
      )}
      {step === "unarchive_select" && (
        <MultiSelect
          label="Select archived products to unarchive"
          items={archivedPolarProducts.map((p) => ({ label: p.name, value: p.id }))}
          onSubmit={handleUnarchiveSelect}
        />
      )}
      {step === "unarchive_running" && (
        <Box flexDirection="column">
          <Spinner label="Unarchiving products on Polar..." />
        </Box>
      )}
      {step === "cleanup_loading" && (
        <Box flexDirection="column">
          <Spinner label="Loading orphan Polar products..." />
        </Box>
      )}
      {step === "cleanup_menu" && (
        <Select
          label={`Found ${orphanProducts.length} orphan Polar product(s). What would you like to do?`}
          options={[
            { label: "Archive orphan products on Polar", value: "archive" },
            { label: "Import orphan products into local JSON", value: "import" },
          ]}
          onSelect={handleCleanupMenuSelect}
        />
      )}
      {step === "cleanup_archive_select" && (
        <MultiSelect
          label="Select orphan products to archive"
          items={orphanProducts.map((p) => ({ label: p.name, value: p.id }))}
          onSubmit={handleCleanupSelect}
        />
      )}
      {step === "cleanup_import_select" && (
        <MultiSelect
          label="Select orphan products to import"
          items={orphanProducts.map((p) => ({ label: p.name, value: p.id }))}
          onSubmit={handleCleanupSelect}
        />
      )}
      {step === "cleanup_running" && (
        <Box flexDirection="column">
          <Spinner label="Processing orphan products..." />
        </Box>
      )}
      {step === "sync_from_sandbox_select" && (
        <MultiSelect
          label="Select sandbox products to sync to production"
          items={sandboxProductsList.map((p) => ({ label: `${p.name} (${p.slug})`, value: p.slug }))}
          onSubmit={handleSyncFromSandboxSelect}
        />
      )}
      {step === "sync_from_sandbox_running" && (
        <Box flexDirection="column">
          <Spinner label="Syncing sandbox products to production..." />
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
          {operationResults.length > 0 && (
            <Box flexDirection="column" marginTop={1}>
              {operationResults.map((r) => (
                <Text key={r.slug} color={r.status === "failure" ? "red" : "green"}>
                  {r.slug}: {r.status === "success" ? "✓" : "✗"} {r.message}
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
