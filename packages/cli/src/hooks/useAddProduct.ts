import { useState, useCallback } from "react";
import { writeProducts, generateYearlyProduct } from "../lib/products.js";
import type { Product } from "../lib/products.js";

export interface UseAddProductOptions {
  products: Product[];
  setProducts: (products: Product[]) => void;
  productsFilePath: string;
  regenerateFiles: (currentProducts: Product[]) => void;
  setStep: (step: string) => void;
  setError: (error: string) => void;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function useAddProduct(options: UseAddProductOptions) {
  const { products, setProducts, productsFilePath, regenerateFiles, setStep, setError } = options;

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

  const resetForm = useCallback(() => {
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
  }, []);

  const buildProduct = useCallback((): Product => {
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
  }, [newType, newName, newSlug, newPrice, newInterval, newDisplayTitle, newFeatures, newCta, newHighlighted]);

  const handleAddType = useCallback((type: string) => {
    setNewType(type);
    setStep("add_name");
  }, [setStep]);

  const handleAddName = useCallback((name: string) => {
    setNewName(name);
    setNewSlug((prev) => prev || slugify(name));
    setStep("add_slug");
  }, [setStep]);

  const handleAddSlug = useCallback((slug: string) => {
    setNewSlug(slug);
    setStep(newType === "free" ? "add_display_title" : "add_price");
  }, [setStep, newType]);

  const handleAddPrice = useCallback((price: string) => {
    setNewPrice(price);
    setStep(newType === "subscription" ? "add_interval" : "add_display_title");
  }, [setStep, newType]);

  const handleAddInterval = useCallback((interval: string) => {
    setNewInterval(interval);
    setStep("add_display_title");
  }, [setStep]);

  const handleAddDisplayTitle = useCallback((title: string) => {
    setNewDisplayTitle(title);
    setStep("add_features");
  }, [setStep]);

  const handleAddFeatures = useCallback((features: string) => {
    setNewFeatures(features);
    setStep("add_cta");
  }, [setStep]);

  const handleAddCta = useCallback((cta: string) => {
    setNewCta(cta);
    setStep("add_highlighted");
  }, [setStep]);

  const handleAddHighlighted = useCallback((highlighted: boolean) => {
    setNewHighlighted(highlighted);
    setStep("add_confirm");
  }, [setStep]);

  const handleConfirmAdd = useCallback((confirmed: boolean) => {
    if (!confirmed) {
      resetForm();
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
      resetForm();
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStep("error");
    }
  }, [products, setProducts, productsFilePath, regenerateFiles, resetForm, buildProduct, setStep, setError]);

  const handleYearlyConfirm = useCallback((confirmed: boolean) => {
    if (confirmed && yearlyDraft) {
      const updated = [...products, yearlyDraft];
      setProducts(updated);
      try {
        writeProducts(productsFilePath, updated);
        regenerateFiles(updated);
        resetForm();
        setStep("done");
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setStep("error");
      }
    } else {
      try {
        regenerateFiles(products);
        resetForm();
        setStep("done");
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setStep("error");
      }
    }
  }, [products, yearlyDraft, productsFilePath, regenerateFiles, resetForm, setStep, setError]);

  return {
    newType,
    newName,
    newSlug,
    newPrice,
    newInterval,
    newDisplayTitle,
    newFeatures,
    newCta,
    newHighlighted,
    yearlyDraft,
    setNewType,
    setNewName,
    setNewSlug,
    setNewPrice,
    setNewInterval,
    setNewDisplayTitle,
    setNewFeatures,
    setNewCta,
    setNewHighlighted,
    setYearlyDraft,
    handleAddType,
    handleAddName,
    handleAddSlug,
    handleAddPrice,
    handleAddInterval,
    handleAddDisplayTitle,
    handleAddFeatures,
    handleAddCta,
    handleAddHighlighted,
    handleConfirmAdd,
    handleYearlyConfirm,
  };
}
