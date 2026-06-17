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
import { readProducts, writeProducts } from "./lib/products.js";
import type { Product } from "./lib/products.js";
import { loadPolarCredentials, createPolarClient } from "./lib/polar.js";
import { useAddProduct } from "./hooks/useAddProduct.js";
import { useProductOperations } from "./hooks/useProductOperations.js";

export interface ProductsWizardProps {
  projectDir: string;
  env: "sandbox" | "production";
  token?: string;
  onComplete?: () => void;
}

export function ProductsWizard({ projectDir, env, token, onComplete }: ProductsWizardProps) {
  const [step, setStep] = useState<string>("loading");
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState("");
  const [polarToken, setPolarToken] = useState<string>("");
  const [credentialTargetStep, setCredentialTargetStep] = useState<string>("");

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

  const ops = useProductOperations({
    products,
    setProducts,
    projectDir,
    env,
    token,
    polarToken,
    productsFilePath,
    otherProductsFilePath,
    step,
    setStep,
    setError,
  });

  const addProduct = useAddProduct({
    products,
    setProducts,
    productsFilePath,
    regenerateFiles: ops.regenerateFiles,
    setStep,
    setError,
  });

  useEffect(() => {
    if (step === "regenerate") {
      ops.handleRegenerate();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

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
    ops.setOperationResults([]);
    if (operation === "add") {
      addProduct.setNewType("");
      addProduct.setNewName("");
      addProduct.setNewSlug("");
      addProduct.setNewPrice("");
      addProduct.setNewInterval("month");
      addProduct.setNewDisplayTitle("");
      addProduct.setNewFeatures("");
      addProduct.setNewCta("Get Started");
      addProduct.setNewHighlighted(false);
      addProduct.setYearlyDraft(null);
      setStep("add_type");
    } else if (operation === "regenerate") {
      setStep("regenerate");
    } else if (operation === "sync") {
      const creds = ensurePolarCredentials("sync_checking");
      if (creds) {
        setStep("sync_checking");
      }
    } else if (operation === "remove") {
      ops.setPendingSelection([]);
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
      ops.setSandboxProductsList(sandboxProducts);
      const creds = ensurePolarCredentials("sync_from_sandbox_select");
      if (creds) {
        setStep("sync_from_sandbox_select");
      }
    }
  };

  const handleRemoveSelect = (slugs: string[]) => {
    if (slugs.length === 0) {
      setStep("menu");
      return;
    }
    ops.setPendingSelection(slugs);
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
    ops.setPendingSelection(ids);
    setStep("unarchive_running");
  };

  const handleCleanupMenuSelect = (action: string) => {
    ops.setCleanupAction(action);
    ops.setPendingSelection([]);
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
    ops.setPendingSelection(ids);
    setStep("cleanup_running");
  };

  const handleSyncFromSandboxSelect = (slugs: string[]) => {
    if (slugs.length === 0) {
      setStep("menu");
      return;
    }
    ops.setPendingSelection(slugs);
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
          onSelect={addProduct.handleAddType}
        />
      )}
      {step === "add_name" && (
        <TextInput
          label="Product name"
          value={addProduct.newName}
          onChange={addProduct.setNewName}
          onSubmit={addProduct.handleAddName}
          placeholder="Pro Monthly"
        />
      )}
      {step === "add_slug" && (
        <TextInput
          label="Product slug"
          value={addProduct.newSlug}
          onChange={addProduct.setNewSlug}
          onSubmit={addProduct.handleAddSlug}
          placeholder={addProduct.newSlug || "pro-monthly"}
        />
      )}
      {step === "add_price" && (
        <TextInput
          label="Price in dollars"
          value={addProduct.newPrice}
          onChange={addProduct.setNewPrice}
          onSubmit={addProduct.handleAddPrice}
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
          onSelect={addProduct.handleAddInterval}
        />
      )}
      {step === "add_display_title" && (
        <TextInput
          label="Display title"
          value={addProduct.newDisplayTitle}
          onChange={addProduct.setNewDisplayTitle}
          onSubmit={addProduct.handleAddDisplayTitle}
          placeholder={addProduct.newName}
        />
      )}
      {step === "add_features" && (
        <TextInput
          label="Features (comma-separated)"
          value={addProduct.newFeatures}
          onChange={addProduct.setNewFeatures}
          onSubmit={addProduct.handleAddFeatures}
          placeholder="Unlimited projects, Priority support"
        />
      )}
      {step === "add_cta" && (
        <TextInput
          label="Call to action"
          value={addProduct.newCta}
          onChange={addProduct.setNewCta}
          onSubmit={addProduct.handleAddCta}
          placeholder="Get Started"
        />
      )}
      {step === "add_highlighted" && (
        <Box flexDirection="column">
          <Text>Highlight this product on the pricing page?</Text>
          <Confirm label="Highlighted" onConfirm={addProduct.handleAddHighlighted} defaultValue={false} />
        </Box>
      )}
      {step === "add_confirm" && (
        <Box flexDirection="column">
          <Text>Add {addProduct.newName} ({addProduct.newSlug})?</Text>
          <Confirm label="Confirm add" onConfirm={addProduct.handleConfirmAdd} defaultValue={true} />
        </Box>
      )}
      {step === "add_yearly" && addProduct.yearlyDraft && (
        <Box flexDirection="column">
          <Text>Would you like to add the yearly counterpart: {addProduct.yearlyDraft.name}?</Text>
          <Text dimColor>Price: ${(addProduct.yearlyDraft.prices[0]?.amount ?? 0) / 100}/year</Text>
          <Confirm label="Add yearly product" onConfirm={addProduct.handleYearlyConfirm} defaultValue={true} />
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
          items={ops.archivedPolarProducts.map((p) => ({ label: p.name, value: p.id }))}
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
          label={`Found ${ops.orphanProducts.length} orphan Polar product(s). What would you like to do?`}
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
          items={ops.orphanProducts.map((p) => ({ label: p.name, value: p.id }))}
          onSubmit={handleCleanupSelect}
        />
      )}
      {step === "cleanup_import_select" && (
        <MultiSelect
          label="Select orphan products to import"
          items={ops.orphanProducts.map((p) => ({ label: p.name, value: p.id }))}
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
          items={ops.sandboxProductsList.map((p) => ({ label: `${p.name} (${p.slug})`, value: p.slug }))}
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
          {ops.syncResults.length > 0 && (
            <Box flexDirection="column" marginTop={1}>
              {ops.syncResults.map((r) => (
                <Text key={r.slug}>
                  {r.slug}: {r.status}
                </Text>
              ))}
            </Box>
          )}
          {ops.operationResults.length > 0 && (
            <Box flexDirection="column" marginTop={1}>
              {ops.operationResults.map((r) => (
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
