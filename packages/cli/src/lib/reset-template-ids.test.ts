import { describe, expect, it } from "vitest";

import { resetTemplateIds } from "./reset-template-ids.js";

describe("resetTemplateIds", () => {
  it("clears polarProductId in product JSON", () => {
    const input = {
      products: [
        { slug: "pro", polarProductId: "abc-123", name: "Pro" },
        { slug: "free", polarProductId: null, name: "Free" },
      ],
    };
    const result = resetTemplateIds(input, "products");
    expect(result.products[0].polarProductId).toBeNull();
    expect(result.products[1].polarProductId).toBeNull();
    expect(result.products[0].name).toBe("Pro");
  });

  it("clears polarMeterId in meter JSON", () => {
    const input = {
      meters: [{ slug: "tokens", polarMeterId: "xyz-789", name: "Tokens" }],
    };
    const result = resetTemplateIds(input, "meters");
    expect(result.meters[0].polarMeterId).toBeNull();
    expect(result.meters[0].name).toBe("Tokens");
  });

  it("returns a new object without mutating the input", () => {
    const input = { products: [{ polarProductId: "abc" }] };
    const result = resetTemplateIds(input, "products");
    expect(result).not.toBe(input);
    expect(input.products[0].polarProductId).toBe("abc");
  });

  it("returns the input unchanged when the key is absent", () => {
    const input = { other: [] };
    const result = resetTemplateIds(input, "products");
    expect(result).toEqual({ other: [] });
  });
});
