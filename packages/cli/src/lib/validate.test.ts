import { describe, expect, it } from "vitest";

import { validateProjectSlug } from "./validate.js";

describe("validateProjectSlug", () => {
  it("accepts a valid lowercase alphanumeric slug with hyphens", () => {
    expect(validateProjectSlug("my-app")).toBeNull();
    expect(validateProjectSlug("tstack-app")).toBeNull();
  });

  it("rejects an empty slug", () => {
    expect(validateProjectSlug("")).toBe("Project slug is required.");
  });

  it("rejects a slug with spaces", () => {
    expect(validateProjectSlug("my app")).toBe(
      "Slug must be lowercase alphanumeric with hyphens only.",
    );
  });

  it("rejects a slug with special characters", () => {
    expect(validateProjectSlug("my@app")).toBe(
      "Slug must be lowercase alphanumeric with hyphens only.",
    );
  });

  it("rejects a slug starting with a number", () => {
    expect(validateProjectSlug("1app")).toBe(
      "Slug must start with a letter.",
    );
  });

  it("rejects a slug with uppercase letters", () => {
    expect(validateProjectSlug("myApp")).toBe(
      "Slug must be lowercase alphanumeric with hyphens only.",
    );
  });
});
