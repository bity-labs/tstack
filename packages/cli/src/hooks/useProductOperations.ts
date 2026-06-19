import { useState, useCallback, useEffect } from "react";
import { existsSync } from "node:fs";
import type { Product } from "../lib/products.js";
import { readProducts, writeProducts } from "../lib/products.js";
import { writeBillingGenerated } from "../lib/billing-generated.js";
import {
  loadPolarCredentials,
  createPolarClient,
  syncProductToPolar,
  checkSyncStatus,
  toBuyerMessage,
  listArchivedPolarProducts,
} from "../lib/polar.js";
import {
  removeProducts,
  unarchiveProducts,
  findOrphanProducts,
  archiveOrphanProducts,
  importOrphanProducts,
  syncSandboxToProduction,
  type OperationResult,
} from "../lib/products-operations.js";

export interface UseProductOperationsOptions {
  products: Product[];
  setProducts: (products: Product[]) => void;
  projectDir: string;
  env: "sandbox" | "production";
  token?: string;
  polarToken: string;
  productsFilePath: string;
  otherProductsFilePath: string;
  step: string;
  setStep: (step: string) => void;
  setError: (error: string) => void;
}

export function useProductOperations(options: UseProductOperationsOptions) {
  const {
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
  } = options;

  const [syncResults, setSyncResults] = useState<Array<{ slug: string; status: string }>>([]);
  const [operationResults, setOperationResults] = useState<OperationResult[]>([]);
  const [pendingSelection, setPendingSelection] = useState<string[]>([]);
  const [archivedPolarProducts, setArchivedPolarProducts] = useState<Array<{ id: string; name: string }>>([]);
  const [orphanProducts, setOrphanProducts] = useState<Array<{ id: string; name: string }>>([]);
  const [cleanupAction, setCleanupAction] = useState<string>("");
  const [sandboxProductsList, setSandboxProductsList] = useState<Product[]>([]);

  const regenerateFiles = useCallback((_currentProducts: Product[]) => {
    writeBillingGenerated({ projectDir });
  }, [projectDir]);

  const handleRegenerate = useCallback(() => {
    try {
      writeBillingGenerated({ projectDir });
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStep("error");
    }
  }, [projectDir, setStep, setError]);

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
  }, [products, projectDir, env, token, polarToken, productsFilePath, setProducts, regenerateFiles, setStep]);

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
  }, [pendingSelection, productsFilePath, projectDir, env, token, polarToken, setProducts, regenerateFiles, setStep]);

  const runUnarchive = useCallback(async () => {
    const credentials = loadPolarCredentials(projectDir, token) ?? { token: polarToken };
    const client = createPolarClient(credentials, env);
    const results = await unarchiveProducts({
      idsToUnarchive: pendingSelection,
      client,
    });
    setOperationResults(results);
    setStep("done");
  }, [pendingSelection, projectDir, env, token, polarToken, setStep]);

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
  }, [cleanupAction, pendingSelection, orphanProducts, productsFilePath, projectDir, env, token, polarToken, setProducts, regenerateFiles, setStep]);

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
  }, [sandboxProductsList, pendingSelection, productsFilePath, projectDir, token, polarToken, setProducts, regenerateFiles, setStep]);

  // Trigger async operations based on step changes
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

  return {
    syncResults,
    operationResults,
    setOperationResults,
    pendingSelection,
    setPendingSelection,
    archivedPolarProducts,
    setArchivedPolarProducts,
    orphanProducts,
    setOrphanProducts,
    cleanupAction,
    setCleanupAction,
    sandboxProductsList,
    setSandboxProductsList,
    regenerateFiles,
    handleRegenerate,
    runSync,
    runRemove,
    runUnarchive,
    runCleanup,
    runSyncFromSandbox,
  };
}
