import { describe, expect, it } from "vitest";

import { replacePlaceholders, buildReplacements } from "./replace.js";

describe("buildReplacements", () => {
  it("builds a map from project slug and display name", () => {
    const map = buildReplacements({ slug: "acme", displayName: "Acme Corp" });
    expect(map.get("myapp")).toBe("acme");
    expect(map.get("MyApp")).toBe("Acme Corp");
  });

  it("includes package name replacement from slug", () => {
    const map = buildReplacements({ slug: "acme", displayName: "Acme" });
    expect(map.get("@tstack/boilerplate")).toBe("acme");
  });

  it("includes default database name replacement", () => {
    const map = buildReplacements({ slug: "acme", displayName: "Acme" });
    expect(map.get("myapp-dev-password")).toBe("acme-dev-password");
    expect(map.get("/myapp")).toBe("/acme");
  });
});

describe("replacePlaceholders", () => {
  it("replaces all known placeholders in text", () => {
    const text = "Welcome to MyApp. Visit myapp.com for more.";
    const result = replacePlaceholders(text, new Map([["myapp", "acme"], ["MyApp", "Acme"]]));
    expect(result).toBe("Welcome to Acme. Visit acme.com for more.");
  });

  it("leaves unknown text unchanged", () => {
    const text = "Hello world";
    const result = replacePlaceholders(text, new Map([["myapp", "acme"]]));
    expect(result).toBe("Hello world");
  });

  it("replaces package names", () => {
    const text = '{"name": "@tstack/boilerplate"}';
    const result = replacePlaceholders(text, new Map([["@tstack/boilerplate", "acme"]]));
    expect(result).toBe('{"name": "acme"}');
  });

  it("replaces database placeholders", () => {
    const text = "postgresql://myapp:myapp-dev-password@localhost:5432/myapp";
    const map = buildReplacements({ slug: "acme", displayName: "Acme" });
    const result = replacePlaceholders(text, map);
    expect(result).toBe("postgresql://acme:acme-dev-password@localhost:5432/acme");
  });

  it("does not replace inside larger words", () => {
    const text = "myapple";
    const result = replacePlaceholders(text, new Map([["myapp", "acme"]]));
    expect(result).toBe("myapple");
  });
});
