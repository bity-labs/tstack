import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// The documentation app's deliverable is the introduction page plus the
// Nimbus scaffolding wiring around it. These tests validate the shipped
// content and the project-owned wiring directly from the source of truth,
// complementing the real `astro build` / `nimbus-docs lint` checks.

const srcDir = path.resolve(import.meta.dirname, "../src");

const introduction = readFileSync(path.join(srcDir, "content/docs/index.mdx"), "utf8");

const [, frontmatter, body] = /^---\n([\S\s]*?)\n---\n([\S\s]*)$/.exec(introduction) ?? [];

describe("introduction page", () => {
  it("declares required page frontmatter", () => {
    expect(frontmatter).toMatch(/^title: "Introduction"$/m);
    expect(frontmatter).toMatch(/^description: ".+"$/m);
  });

  it("introduces the docs as Nimbus Docs product documentation", () => {
    expect(body).toContain("[Nimbus Docs](https://nimbus-docs.com)");
    expect(body).toContain("customer-facing documentation");
    expect(body).toContain("separate from TStack's own documentation in `apps/documentation`");
  });

  it("keeps the one-page product-doc scope and next-steps guidance", () => {
    expect(body).toContain("## Authoring");
    expect(body).toContain("## Next steps");
    expect(body).toMatch(/\[Nimbus Docs\]/);
  });
});

describe("nimbus scaffold wiring", () => {
  it("registers the docs and partials content collections", () => {
    const config = readFileSync(path.join(srcDir, "content.config.ts"), "utf8");

    expect(config).toContain("docsCollection({");
    expect(config).toContain("partialsCollection()");
  });

  it("keeps the machine-readable llms endpoints", () => {
    for (const route of ["llms-full.txt.ts", "llms.txt.ts"]) {
      const route_ = readFileSync(path.join(srcDir, "pages", route), "utf8");

      expect(route_).toContain("@cloudflare/nimbus-docs/agent-endpoints");
      expect(route_).toContain("export const prerender = true;");
    }
  });

  it("configures the Nimbus static output with site, title, and origin placeholder", () => {
    const astroConfig = readFileSync(
      path.resolve(import.meta.dirname, "../astro.config.ts"),
      "utf8"
    );

    expect(astroConfig).toContain('output: "static"');
    expect(astroConfig).toContain('title: "Boilerplate Documentation"');
    expect(astroConfig).toContain("https://boilerplate-docs.example.com");
  });
});
