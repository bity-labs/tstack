import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Runs after `astro build` in the workspace `test` script: asserts that the
// production standalone output actually serves the welcome behavior, not
// just that a page exists in src/.
describe("production build output", () => {
  const distIndex = path.resolve(import.meta.dirname, "../dist/index.html");

  it("dist/index.html exists from the production build", () => {
    expect(readFileSync(distIndex, "utf8")).toBeTypeOf("string");
  });

  it("dist/index.html serves the welcome copy", () => {
    const html = readFileSync(distIndex, "utf8");

    expect(html).toContain("Welcome to <strong>TStack</strong>");
    expect(html).toContain("Static site scaffolded with Astro in the TStack workspace.");
    // The built page must ship the plain global CSS (Astro inlines it) and no script.
    expect(html).toContain("<style>");
    expect(html).toMatch(/color-scheme|color-bg/);
    expect(html).not.toContain("<script");
  });
});
